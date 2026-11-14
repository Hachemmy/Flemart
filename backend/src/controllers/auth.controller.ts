import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database';
import { z } from 'zod';
import { JWT_SECRET, env, isProduction } from '../config/env';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_MAX_AGE_MS = 5 * 60 * 1000;
const OAUTH_CODE_MAX_AGE_MS = 5 * 60 * 1000;

const oauthCookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    path: '/',
    maxAge: OAUTH_STATE_MAX_AGE_MS,
};

function parseCookies(req: Request): Record<string, string> {
    const header = req.headers.cookie;
    if (!header) return {};

    return header.split(';').reduce((acc, part) => {
        const index = part.indexOf('=');
        if (index === -1) return acc;
        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (key) acc[key] = decodeURIComponent(value);
        return acc;
    }, {} as Record<string, string>);
}

function signLinkState(userId: number): string {
    return jwt.sign({ type: 'link', userId }, JWT_SECRET, { expiresIn: '5m' });
}

function verifyLinkState(state: string): number | null {
    try {
        const payload = jwt.verify(state, JWT_SECRET, { algorithms: ['HS256'] }) as {
            type?: string;
            userId?: number;
        };
        if (payload.type !== 'link' || typeof payload.userId !== 'number') return null;
        return payload.userId;
    } catch {
        return null;
    }
}

function githubRedirectUri(): string {
    return `${env.BACKEND_URL || 'http://localhost:5000'}/api/auth/github/callback`;
}

// Remove expired or already-used one-time OAuth codes.
const oauthCodeCleanup = setInterval(() => {
    pool.execute('DELETE FROM OAuthCodes WHERE expires_at < NOW() OR used = TRUE').catch(() => {});
}, 60 * 60 * 1000);
oauthCodeCleanup.unref();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
    username: z.string().min(3)
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

export async function register(req: Request, res: Response) {
    try {
        const { email, password, username } = registerSchema.parse(req.body);

        // Check if user exists
        const [existing] = await pool.execute('SELECT id FROM Users WHERE email = ?', [email]);
        if ((existing as any[]).length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await pool.execute(
            'INSERT INTO Users (email, password, username) VALUES (?, ?, ?)',
            [email, hashedPassword, username]
        );

        const userId = (result as any).insertId;

        // Generate token
        const token = jwt.sign(
            { id: userId, email, username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: userId, email, username }
        });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = loginSchema.parse(req.body);

        // Find user
        const [users] = await pool.execute('SELECT * FROM Users WHERE email = ?', [email]);
        const user = (users as any[])[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email, username: user.username }
        });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getMe(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [users] = await pool.execute('SELECT id, email, username, photo, github_id FROM Users WHERE id = ?', [userId]);
        const user = (users as any[])[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

const updateProfileSchema = z.object({
    username: z.string().min(3).optional(),
    photo: z.string().url().optional().nullable(),
    currentPassword: z.string().min(6).optional(),
    newPassword: z.string().min(6).optional(),
});

export async function updateProfile(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { username, photo, currentPassword, newPassword } = updateProfileSchema.parse(req.body);

        if (username) {
            const [existing] = await pool.execute(
                'SELECT id FROM Users WHERE username = ? AND id != ?',
                [username, userId]
            );
            if ((existing as any[]).length > 0) {
                return res.status(409).json({ error: 'Username already taken' });
            }
        }

        if (currentPassword && newPassword) {
            const [users] = await pool.execute('SELECT password FROM Users WHERE id = ?', [userId]);
            const user = (users as any[])[0];
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const valid = await bcrypt.compare(currentPassword, user.password);
            if (!valid) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await pool.execute('UPDATE Users SET password = ? WHERE id = ?', [hashedPassword, userId]);
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (username) {
            updates.push('username = ?');
            values.push(username);
        }
        if (photo !== undefined) {
            updates.push('photo = ?');
            values.push(photo);
        }

        if (updates.length > 0) {
            values.push(userId);
            await pool.execute(`UPDATE Users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        const [users] = await pool.execute('SELECT id, email, username, photo FROM Users WHERE id = ?', [userId]);
        const user = (users as any[])[0];

        const newToken = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ message: 'Profile updated successfully', user, token: newToken });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}

export function githubAuth(req: Request, res: Response) {
    const clientId = env.GITHUB_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'GitHub client ID is not configured' });
    }

    const state = crypto.randomBytes(32).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE, state, oauthCookieOptions);

    const scope = 'read:user user:email';
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(githubRedirectUri())}&scope=${encodeURIComponent(scope)}&state=${state}&login=`;
    res.redirect(url);
}

export function githubLink(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const clientId = env.GITHUB_CLIENT_ID;
        if (!clientId) {
            return res.status(500).json({ error: 'GitHub client ID is not configured' });
        }

        const state = signLinkState(userId);
        const scope = 'read:user user:email';
        const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(githubRedirectUri())}&scope=${encodeURIComponent(scope)}&state=${state}&login=`;
        res.json({ url });
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function githubCallback(req: Request, res: Response) {
    const frontendUrl = env.FRONTEND_URL;
    const { code, state } = req.query;
    const linkUserId = typeof state === 'string' ? verifyLinkState(state) : null;
    const isLinkMode = linkUserId !== null;
    const errorBase = isLinkMode ? `${frontendUrl}/profile` : `${frontendUrl}/login`;

    try {
        if (typeof code !== 'string' || !code) {
            return res.redirect(`${errorBase}?error=oauth_failed`);
        }
        if (typeof state !== 'string' || !state) {
            return res.redirect(`${errorBase}?error=invalid_state`);
        }

        // Login CSRF protection: the state must match the HttpOnly cookie set by githubAuth.
        if (!isLinkMode) {
            const cookieState = parseCookies(req)[OAUTH_STATE_COOKIE];
            res.clearCookie(OAUTH_STATE_COOKIE, {
                httpOnly: true,
                sameSite: 'lax',
                secure: isProduction,
                path: '/',
            });
            if (!cookieState || cookieState !== state) {
                return res.redirect(`${errorBase}?error=invalid_state`);
            }
        }

        if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
            return res.redirect(`${errorBase}?error=github_not_configured`);
        }

        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code,
            }),
        });
        const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
        if (tokenData.error || !tokenData.access_token) {
            return res.redirect(`${errorBase}?error=oauth_failed`);
        }

        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        if (!userResponse.ok) {
            return res.redirect(`${errorBase}?error=oauth_failed`);
        }
        const githubUser = (await userResponse.json()) as {
            id: number;
            login: string;
            avatar_url?: string;
        };
        if (!githubUser.id || !githubUser.login) {
            return res.redirect(`${errorBase}?error=oauth_failed`);
        }

        const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        if (!emailResponse.ok) {
            return res.redirect(`${errorBase}?error=email_unavailable`);
        }
        const emails = (await emailResponse.json()) as {
            email: string;
            primary: boolean;
            verified: boolean;
        }[];
        if (!Array.isArray(emails)) {
            return res.redirect(`${errorBase}?error=email_unavailable`);
        }

        const verifiedEmail =
            emails.find((e) => e.primary && e.verified)?.email ||
            emails.find((e) => e.verified)?.email ||
            null;
        if (!verifiedEmail) {
            return res.redirect(`${errorBase}?error=email_not_verified`);
        }

        const githubId = String(githubUser.id);

        // Link mode: signed state carries the authenticated user id.
        if (isLinkMode) {
            const [conflict] = await pool.execute(
                'SELECT id FROM Users WHERE github_id = ? AND id != ?',
                [githubId, linkUserId]
            );
            if ((conflict as any[]).length > 0) {
                return res.redirect(`${frontendUrl}/profile?error=github_taken`);
            }

            const [linkUser] = await pool.execute('SELECT id FROM Users WHERE id = ?', [linkUserId]);
            if ((linkUser as any[]).length === 0) {
                return res.redirect(`${frontendUrl}/profile?error=invalid_token`);
            }

            await pool.execute(
                'UPDATE Users SET github_id = ?, photo = COALESCE(photo, ?), github_token = ? WHERE id = ?',
                [githubId, githubUser.avatar_url || null, tokenData.access_token, linkUserId]
            );
            return res.redirect(`${frontendUrl}/profile?success=github_linked`);
        }

        // Login/register: match by GitHub id first, then by verified email.
        let existingUser: any;
        const [byGithubId] = await pool.execute(
            'SELECT id, username, email, github_id FROM Users WHERE github_id = ?',
            [githubId]
        );
        existingUser = (byGithubId as any[])[0];

        if (!existingUser) {
            const [byEmail] = await pool.execute(
                'SELECT id, username, email, github_id FROM Users WHERE email = ?',
                [verifiedEmail]
            );
            const emailUser = (byEmail as any[])[0];
            if (emailUser) {
                if (emailUser.github_id && emailUser.github_id !== githubId) {
                    return res.redirect(`${frontendUrl}/login?error=github_account_mismatch`);
                }
                existingUser = emailUser;
            }
        }

        let userId: number;

        if (existingUser) {
            userId = existingUser.id;

            if (!existingUser.github_id) {
                await pool.execute(
                    'UPDATE Users SET github_id = ?, photo = ?, github_token = ? WHERE id = ?',
                    [githubId, githubUser.avatar_url || null, tokenData.access_token, userId]
                );
            } else {
                await pool.execute('UPDATE Users SET github_token = ? WHERE id = ?', [
                    tokenData.access_token,
                    userId,
                ]);
            }
        } else {
            const baseUsername =
                githubUser.login.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'github_user';
            let candidate = baseUsername.length >= 3 ? baseUsername : `user_${baseUsername}`;

            for (let i = 0; i < 10; i++) {
                const [conflict] = await pool.execute('SELECT id FROM Users WHERE username = ?', [
                    candidate,
                ]);
                if ((conflict as any[]).length === 0) break;
                candidate = `${baseUsername}_${crypto.randomBytes(3).toString('hex')}`;
            }

            const [result] = await pool.execute(
                'INSERT INTO Users (email, password, username, github_id, photo, github_token) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    verifiedEmail,
                    await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
                    candidate,
                    githubId,
                    githubUser.avatar_url || null,
                    tokenData.access_token,
                ]
            );
            userId = (result as any).insertId;
        }

        // Never put the JWT in a URL. Issue a short-lived, single-use code instead.
        const oauthCode = crypto.randomBytes(32).toString('hex');
        await pool.execute(
            'INSERT INTO OAuthCodes (code, user_id, expires_at) VALUES (?, ?, ?)',
            [oauthCode, userId, new Date(Date.now() + OAUTH_CODE_MAX_AGE_MS)]
        );

        res.redirect(`${frontendUrl}/login?code=${oauthCode}`);
    } catch (error) {
        console.error('githubCallback error:', error);
        res.redirect(`${errorBase}?error=oauth_failed`);
    }
}

const exchangeSchema = z.object({
    code: z.string().min(1),
});

export async function exchangeOAuthCode(req: Request, res: Response) {
    const connection = await pool.getConnection();
    let committed = false;
    try {
        const { code } = exchangeSchema.parse(req.body);

        await connection.beginTransaction();

        const [rows] = await connection.execute(
            'SELECT id, user_id, expires_at, used FROM OAuthCodes WHERE code = ? FOR UPDATE',
            [code]
        );
        const record = (rows as any[])[0];

        if (!record || record.used || new Date(record.expires_at).getTime() < Date.now()) {
            await connection.rollback();
            return res.status(401).json({ error: 'Invalid or expired code' });
        }

        await connection.execute('UPDATE OAuthCodes SET used = TRUE WHERE id = ?', [record.id]);

        const [users] = await connection.execute(
            'SELECT id, email, username, photo, github_id FROM Users WHERE id = ?',
            [record.user_id]
        );
        const user = (users as any[])[0];
        if (!user) {
            await connection.rollback();
            return res.status(404).json({ error: 'User not found' });
        }

        await connection.commit();
        committed = true;

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, user });
    } catch (error: any) {
        if (!committed) {
            await connection.rollback();
        }
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('exchangeOAuthCode error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
}
