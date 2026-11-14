import { Request, Response } from 'express';
import crypto from 'crypto';
import pool from '../config/database';

const MAX_LEVEL = 50;
const SESSION_TTL_MS = 60 * 60 * 1000;

interface QuizSessionRow {
    id: string;
    user_id: number;
    language: string;
    level: number;
    question_ids: string | number[];
    expires_at: Date | string;
    completed: number | boolean;
}

function parseQuestionIds(value: unknown): number[] {
    if (Array.isArray(value)) {
        return value.map(Number).filter(Number.isInteger);
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed)
                ? parsed.map(Number).filter(Number.isInteger)
                : [];
        } catch {
            return [];
        }
    }
    return [];
}

function isSessionExpired(session: QuizSessionRow): boolean {
    return new Date(session.expires_at).getTime() < Date.now();
}

export async function getQuizLanguages(req: Request, res: Response) {
    try {
        const [rows] = await pool.execute(
            'SELECT DISTINCT language FROM QuizQuestions ORDER BY language'
        );
        res.json({ languages: (rows as any[]).map(r => r.language) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getQuizQuestions(req: Request, res: Response) {
    try {
        const { language } = req.params;
        const { level } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!level) {
            return res.status(400).json({ error: 'Level is required' });
        }

        const levelNum = parseInt(level as string, 10);
        if (isNaN(levelNum) || levelNum < 1 || levelNum > MAX_LEVEL) {
            return res.status(400).json({ error: `Level must be between 1 and ${MAX_LEVEL}` });
        }

        const [questions] = await pool.execute(
            `SELECT id, question, option_a, option_b, option_c, option_d 
             FROM QuizQuestions 
             WHERE language = ? AND difficulty_level = ? 
             ORDER BY RAND() 
             LIMIT 1`,
            [language, levelNum]
        );

        const rows = questions as any[];
        if (rows.length === 0) {
            return res.json({ questions: [], sessionId: null });
        }

        const sessionId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

        await pool.execute(
            `INSERT INTO QuizSessions (id, user_id, language, level, question_ids, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sessionId, userId, language, levelNum, JSON.stringify([rows[0].id]), expiresAt]
        );

        res.json({ sessionId, questions: rows });
    } catch (error) {
        console.error('getQuizQuestions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function submitQuizAnswer(req: Request, res: Response) {
    try {
        const { sessionId, questionId, answer } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!sessionId || !questionId || !answer) {
            return res.status(400).json({ error: 'sessionId, questionId and answer are required' });
        }

        if (!['a', 'b', 'c', 'd'].includes(String(answer))) {
            return res.status(400).json({ error: 'Answer must be a, b, c or d' });
        }

        const [sessions] = await pool.execute(
            'SELECT * FROM QuizSessions WHERE id = ? AND user_id = ?',
            [sessionId, userId]
        );
        const session = (sessions as QuizSessionRow[])[0];

        if (!session) {
            return res.status(404).json({ error: 'Quiz session not found' });
        }
        if (session.completed) {
            return res.status(400).json({ error: 'Quiz session already completed' });
        }
        if (isSessionExpired(session)) {
            return res.status(400).json({ error: 'Quiz session expired' });
        }

        const questionIds = parseQuestionIds(session.question_ids);
        if (!questionIds.includes(Number(questionId))) {
            return res.status(400).json({ error: 'Question does not belong to this session' });
        }

        const [existingAttempts] = await pool.execute(
            'SELECT id FROM QuizAttempts WHERE session_id = ? AND question_id = ?',
            [sessionId, questionId]
        );
        if ((existingAttempts as any[]).length > 0) {
            return res.status(409).json({ error: 'Question already answered' });
        }

        const [questions] = await pool.execute(
            'SELECT correct_answer FROM QuizQuestions WHERE id = ?',
            [questionId]
        );
        const question = (questions as any[])[0];
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const isCorrect = question.correct_answer === answer;

        try {
            await pool.execute(
                'INSERT INTO QuizAttempts (session_id, question_id, answer, is_correct) VALUES (?, ?, ?, ?)',
                [sessionId, questionId, answer, isCorrect]
            );
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Question already answered' });
            }
            throw error;
        }

        // Never return the correct answer: the client must not be able to cheat.
        res.json({ correct: isCorrect });
    } catch (error) {
        console.error('submitQuizAnswer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function completeQuizLevel(req: Request, res: Response) {
    const connection = await pool.getConnection();
    try {
        const { sessionId } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required' });
        }

        await connection.beginTransaction();

        const [sessions] = await connection.execute(
            'SELECT * FROM QuizSessions WHERE id = ? AND user_id = ? FOR UPDATE',
            [sessionId, userId]
        );
        const session = (sessions as QuizSessionRow[])[0];

        if (!session) {
            await connection.rollback();
            return res.status(404).json({ error: 'Quiz session not found' });
        }
        if (session.completed) {
            await connection.rollback();
            return res.status(409).json({ error: 'Quiz session already completed' });
        }
        if (isSessionExpired(session)) {
            await connection.rollback();
            return res.status(400).json({ error: 'Quiz session expired' });
        }

        const levelNum = Number(session.level);
        if (levelNum < 1 || levelNum > MAX_LEVEL) {
            await connection.rollback();
            return res.status(400).json({ error: `Level must be between 1 and ${MAX_LEVEL}` });
        }

        const [attempts] = await connection.execute(
            'SELECT is_correct FROM QuizAttempts WHERE session_id = ?',
            [sessionId]
        );
        const attemptRows = attempts as any[];
        const total = attemptRows.length;

        if (total === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'No answers submitted for this session' });
        }

        const score = attemptRows.filter((a) => Boolean(a.is_correct)).length;
        const passed = score / total >= 0.7;

        await connection.execute('UPDATE QuizSessions SET completed = TRUE WHERE id = ?', [sessionId]);

        const [existing] = await connection.execute(
            'SELECT id, current_level, completed_levels, total_xp_earned FROM QuizProgress WHERE user_id = ? AND language = ? FOR UPDATE',
            [userId, session.language]
        );
        const progress = (existing as any[])[0];

        // A level is only playable when the previous one is validated.
        const unlockedUpTo = progress ? Number(progress.current_level) : 1;
        if (levelNum > unlockedUpTo) {
            await connection.rollback();
            return res.status(403).json({
                error: 'This level is not unlocked yet. Complete the previous levels first.',
            });
        }

        let xpEarned = 0;

        if (!progress) {
            if (passed) {
                xpEarned = 5;
                await connection.execute(
                    'INSERT INTO QuizProgress (user_id, language, current_level, completed_levels, total_xp_earned) VALUES (?, ?, ?, ?, ?)',
                    [userId, session.language, Math.min(levelNum + 1, MAX_LEVEL), levelNum, xpEarned]
                );
            } else {
                await connection.execute(
                    'INSERT INTO QuizProgress (user_id, language, current_level, completed_levels, total_xp_earned) VALUES (?, ?, 1, 0, 0)',
                    [userId, session.language]
                );
            }
        } else if (passed) {
            const previousCompleted = Number(progress.completed_levels);
            const isFirstPass = levelNum > previousCompleted;
            if (isFirstPass) xpEarned = 5;

            const newCompleted = Math.min(Math.max(previousCompleted, levelNum), MAX_LEVEL);
            const newTotalXp = Number(progress.total_xp_earned) + xpEarned;
            const newCurrentLevel = Math.min(
                Math.max(Number(progress.current_level), levelNum + 1),
                MAX_LEVEL
            );

            await connection.execute(
                'UPDATE QuizProgress SET current_level = ?, completed_levels = ?, total_xp_earned = ? WHERE id = ?',
                [newCurrentLevel, newCompleted, newTotalXp, progress.id]
            );
        }

        await connection.commit();

        res.json({
            passed,
            xpEarned,
            score,
            total,
            message: passed ? `Level passed! +${xpEarned} XP` : 'Keep trying!',
        });
    } catch (error) {
        await connection.rollback();
        console.error('completeQuizLevel error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
}

export async function getQuizProgress(req: Request, res: Response) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [progress] = await pool.execute(
            'SELECT language, current_level, completed_levels, total_xp_earned FROM QuizProgress WHERE user_id = ?',
            [userId]
        );

        res.json({ progress });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
