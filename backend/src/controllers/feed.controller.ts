import { Request, Response } from 'express';
import pool from '../config/database';

export async function getFeed(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const [projects] = await pool.execute(
            `SELECT p.*, u.username, u.photo,
                (SELECT COUNT(*) FROM Likes WHERE project_id = p.id) as like_count,
                EXISTS(SELECT 1 FROM Likes WHERE project_id = p.id AND user_id = ?) as user_liked
             FROM Projects p
             JOIN Users u ON p.user_id = u.id
             WHERE p.status IN ('success', 'abandoned')
             AND p.user_id != ?
             ORDER BY p.created_at DESC`,
            [userId || 0, userId || 0]
        );
        res.json({ projects });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function toggleLike(req: Request, res: Response) {
    const connection = await pool.getConnection();
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { id } = req.params;

        await connection.beginTransaction();

        const [existing] = await connection.execute(
            'SELECT id FROM Likes WHERE user_id = ? AND project_id = ? FOR UPDATE',
            [userId, id]
        );

        if ((existing as any[]).length > 0) {
            await connection.execute('DELETE FROM Likes WHERE user_id = ? AND project_id = ?', [userId, id]);
            await connection.commit();
            res.json({ liked: false });
        } else {
            await connection.execute('INSERT INTO Likes (user_id, project_id) VALUES (?, ?)', [userId, id]);
            await connection.commit();

            const [projectRows] = await pool.execute('SELECT user_id, title FROM Projects WHERE id = ?', [id]);
            const project = (projectRows as any[])[0];
            if (project && project.user_id !== userId) {
                const [userRows] = await pool.execute('SELECT username, photo FROM Users WHERE id = ?', [userId]);
                const actor = (userRows as any[])[0];
                const username = actor?.username || 'Quelqu\'un';
                await pool.execute(
                    'INSERT INTO Notifications (user_id, actor_id, type, message) VALUES (?, ?, ?, ?)',
                    [project.user_id, userId, 'activity', `${username} a aim\u00e9 votre projet "${project.title}"`]
                );
            }

            res.json({ liked: true });
        }
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
}

export async function resumeProject(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { id } = req.params;

        const [existing] = await pool.execute('SELECT * FROM Projects WHERE id = ?', [id]);
        const original = (existing as any[])[0];

        if (!original) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (original.user_id === userId) {
            return res.status(400).json({ error: 'Cannot resume your own project' });
        }

        const [userRows] = await pool.execute('SELECT github_id FROM Users WHERE id = ?', [userId]);
        const user = (userRows as any[])[0];
        if (!user?.github_id) {
            return res.status(403).json({ error: 'Only GitHub users can resume projects' });
        }

        const [duplicate] = await pool.execute(
            'SELECT id FROM Projects WHERE user_id = ? AND title = ?',
            [userId, original.title]
        );
        if ((duplicate as any[]).length > 0) {
            return res.status(409).json({ error: 'You already have a project with this title' });
        }

        const [result] = await pool.execute(
            'INSERT INTO Projects (user_id, title, description, github_link, status, readme) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, original.title, original.description, original.github_link, 'in_progress', original.readme]
        );

        const [notifUserRows] = await pool.execute('SELECT username FROM Users WHERE id = ?', [userId]);
        const username = (notifUserRows as any[])[0]?.username || 'Quelqu\'un';
        await pool.execute(
            'INSERT INTO Notifications (user_id, actor_id, type, message) VALUES (?, ?, ?, ?)',
            [original.user_id, userId, 'activity', `${username} a repris votre projet "${original.title}"`]
        );

        const projectId = (result as any).insertId;
        res.status(201).json({ message: 'Project resumed successfully', projectId });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
