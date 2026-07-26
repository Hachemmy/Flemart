import { Request, Response } from 'express';
import pool from '../config/database';

export async function getNotifications(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [notifications] = await pool.execute(
            `SELECT n.*, UNIX_TIMESTAMP(n.created_at) as created_timestamp,
                    u.username as actor_username, u.photo as actor_photo
             FROM Notifications n
             LEFT JOIN Users u ON n.actor_id = u.id
             WHERE n.user_id = ?
             ORDER BY n.created_at DESC`,
            [userId]
        );

        res.json({ notifications });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function markAsRead(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [result] = await pool.execute(
            'UPDATE Notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function deleteNotification(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [result] = await pool.execute(
            'DELETE FROM Notifications WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function markAllAsRead(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        await pool.execute(
            'UPDATE Notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
            [userId]
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
