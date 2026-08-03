import { Request, Response } from 'express';
import pool from '../config/database';

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

        if (!level) {
            return res.status(400).json({ error: 'Level is required' });
        }

        const levelNum = parseInt(level as string, 10);
        if (isNaN(levelNum) || levelNum < 1 || levelNum > 100) {
            return res.status(400).json({ error: 'Level must be between 1 and 100' });
        }

        const [questions] = await pool.execute(
            `SELECT id, question, option_a, option_b, option_c, option_d 
             FROM QuizQuestions 
             WHERE language = ? AND difficulty_level = ? 
             ORDER BY RAND() 
             LIMIT 1`,
            [language, levelNum]
        );

        if ((questions as any[]).length === 0) {
            const fallbackMin = Math.max(1, levelNum - 5);
            const fallbackMax = Math.min(100, levelNum + 5);
            const [fallback] = await pool.execute(
                `SELECT id, question, option_a, option_b, option_c, option_d 
                 FROM QuizQuestions 
                 WHERE language = ? AND difficulty_level BETWEEN ? AND ? 
                 ORDER BY RAND() 
                 LIMIT 1`,
                [language, fallbackMin, fallbackMax]
            );
            return res.json({ questions: fallback });
        }

        res.json({ questions });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function submitQuizAnswer(req: Request, res: Response) {
    try {
        const { questionId, answer } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!questionId || !answer) {
            return res.status(400).json({ error: 'questionId and answer are required' });
        }

        const [rows] = await pool.execute(
            'SELECT correct_answer, language, difficulty_level FROM QuizQuestions WHERE id = ?',
            [questionId]
        );

        const question = (rows as any[])[0];
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const isCorrect = question.correct_answer === answer;

        res.json({
            correct: isCorrect,
            correctAnswer: question.correct_answer,
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function completeQuizLevel(req: Request, res: Response) {
    const connection = await pool.getConnection();
    try {
        const { language, level, score } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!language || !level || score === undefined) {
            return res.status(400).json({ error: 'language, level, and score are required' });
        }

        const levelNum = parseInt(level, 10);
        const scoreNum = parseInt(score, 10);

        if (isNaN(levelNum) || isNaN(scoreNum)) {
            return res.status(400).json({ error: 'Level and score must be valid numbers' });
        }

        if (levelNum < 1 || levelNum > 100) {
            return res.status(400).json({ error: 'Level must be between 1 and 100' });
        }

        if (scoreNum < 0 || scoreNum > 10) {
            return res.status(400).json({ error: 'Score must be between 0 and 10' });
        }

        const passed = scoreNum >= 1;

        await connection.beginTransaction();

        const [existing] = await connection.execute(
            'SELECT id, current_level, completed_levels, total_xp_earned FROM QuizProgress WHERE user_id = ? AND language = ? FOR UPDATE',
            [userId, language]
        );

        const progress = (existing as any[])[0];

        if (!progress) {
            if (passed) {
                await connection.execute(
                    'INSERT INTO QuizProgress (user_id, language, current_level, completed_levels, total_xp_earned) VALUES (?, ?, ?, 1, 5)',
                    [userId, language, Math.min(levelNum + 1, 100)]
                );
            } else {
                await connection.execute(
                    'INSERT INTO QuizProgress (user_id, language, current_level, completed_levels, total_xp_earned) VALUES (?, ?, ?, 0, 0)',
                    [userId, language, levelNum]
                );
            }
        } else if (passed) {
            const newCompleted = Number(progress.completed_levels) + 1;
            const newTotalXp = Number(progress.total_xp_earned) + 5;
            const newCurrentLevel = Math.min(Math.max(Number(progress.current_level), levelNum + 1), 100);

            await connection.execute(
                'UPDATE QuizProgress SET current_level = ?, completed_levels = ?, total_xp_earned = ? WHERE id = ?',
                [newCurrentLevel, newCompleted, newTotalXp, progress.id]
            );
        }

        await connection.commit();

        const xpEarned = passed ? 5 : 0;

        res.json({
            passed,
            xpEarned,
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
