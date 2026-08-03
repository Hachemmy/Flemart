import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database';
import { z } from 'zod';

// Pending GitHub link states: state -> { userId, expiresAt }
const pendingGithubLinks = new Map<string, { userId: number; expiresAt: number }>();

// Cleanup expired states every 60 seconds
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of pendingGithubLinks) {
        if (value.expiresAt < now) {
            pendingGithubLinks.delete(key);
        }
    }
}, 60_000);

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
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
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
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
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
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
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
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'GitHub client ID is not configured' });
    }
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/github/callback`;
    const scope = 'read:user user:email';
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&login=`;
    res.redirect(url);
}

export function githubLink(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const state = crypto.randomUUID();
        pendingGithubLinks.set(state, {
            userId,
            expiresAt: Date.now() + 5 * 60 * 1000,
        });

        const clientId = process.env.GITHUB_CLIENT_ID;
        const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/github/callback`;
        const scope = 'read:user user:email';
        const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&login=`;
        res.json({ url });
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function githubCallback(req: Request, res: Response) {
    try {
        const { code, state } = req.query;
        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            }),
        });
        const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
        if (tokenData.error || !tokenData.access_token) {
            return res.status(401).json({ error: 'GitHub authentication failed' });
        }

        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        const githubUser = (await userResponse.json()) as { id: number; login: string; email?: string; avatar_url: string };

        const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        const emails = (await emailResponse.json()) as { email: string; primary: boolean }[];
        const primaryEmail = emails.find((e) => e.primary)?.email || githubUser.email;
        const emailToUse = primaryEmail || `${githubUser.login || 'github_user'}@users.noreply.github.com`;

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Link mode: check if state corresponds to a pending GitHub link
        if (typeof state === 'string' && pendingGithubLinks.has(state)) {
            const pending = pendingGithubLinks.get(state)!;
            pendingGithubLinks.delete(state); // One-time use

            if (pending.expiresAt < Date.now()) {
                return res.redirect(`${frontendUrl}/profile?error=expired_link`);
            }

            try {
                // Check if another user already has this github_id
                const [conflict] = await pool.execute(
                    'SELECT id FROM Users WHERE github_id = ? AND id != ?',
                    [String(githubUser.id), pending.userId]
                );
                if ((conflict as any[]).length > 0) {
                    return res.redirect(`${frontendUrl}/profile?error=github_taken`);
                }

                await pool.execute(
                    'UPDATE Users SET github_id = ?, photo = COALESCE(photo, ?), github_token = ? WHERE id = ?',
                    [String(githubUser.id), githubUser.avatar_url, tokenData.access_token, pending.userId]
                );
                return res.redirect(`${frontendUrl}/profile?success=github_linked`);
            } catch {
                return res.redirect(`${frontendUrl}/profile?error=invalid_token`);
            }
        }

        // Normal login/register flow
        const [existingUsers] = await pool.execute(
            'SELECT * FROM Users WHERE github_id = ? OR email = ?',
            [String(githubUser.id), emailToUse]
        );
        const existingUser = (existingUsers as any[])[0];

        let userId: number;
        let username: string;

        if (existingUser) {
            userId = existingUser.id;
            username = existingUser.username;
            if (!existingUser.github_id) {
                await pool.execute('UPDATE Users SET github_id = ?, photo = ?, github_token = ? WHERE id = ?', [
                    String(githubUser.id),
                    githubUser.avatar_url,
                    tokenData.access_token,
                    userId,
                ]);
            } else {
                await pool.execute('UPDATE Users SET github_token = ? WHERE id = ?', [
                    tokenData.access_token,
                    userId,
                ]);
            }
        } else {
            username = githubUser.login;
            const [result] = await pool.execute(
                'INSERT INTO Users (email, password, username, github_id, photo, github_token) VALUES (?, ?, ?, ?, ?, ?)',
                [emailToUse, await bcrypt.hash(Math.random().toString(36), 10), username, String(githubUser.id), githubUser.avatar_url, tokenData.access_token]
            );
            userId = (result as any).insertId;
        }

        const jwtToken = jwt.sign(
            { id: userId, email: emailToUse, username },
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: '7d' }
        );

        res.redirect(`${frontendUrl}/login?token=${jwtToken}&user=${encodeURIComponent(JSON.stringify({ id: userId, email: emailToUse, username, photo: githubUser.avatar_url }))}`);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
