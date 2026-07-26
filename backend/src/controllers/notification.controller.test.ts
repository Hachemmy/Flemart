import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import pool from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

let token: string;
let userId: number;

beforeAll(async () => {
    // Create a test user
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const [result] = await pool.execute(
        'INSERT INTO Users (email, password, username) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        ['notif-test@example.com', hashedPassword, 'notif-testuser']
    );
    userId = (result as any).insertId;
    token = jwt.sign({ id: userId, email: 'notif-test@example.com', username: 'notif-testuser' }, JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
    await pool.execute('DELETE FROM Notifications WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM Users WHERE id = ?', [userId]);
    await pool.end();
});

describe('Notification Controller', () => {
    let notificationId: number;

    describe('POST /api/notifications (via other endpoints)', () => {
        it('should seed a test notification for testing', async () => {
            await pool.execute(
                'INSERT INTO Notifications (user_id, type, message) VALUES (?, ?, ?)',
                [userId, 'motivation', 'Test notification message']
            );
        });
    });

    describe('GET /api/notifications', () => {
        it('should return notifications for authenticated user', async () => {
            const res = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('notifications');
            expect(Array.isArray(res.body.notifications)).toBe(true);
            expect(res.body.notifications.length).toBeGreaterThanOrEqual(1);
            notificationId = res.body.notifications[0].id;
        });

        it('should return 401 without token', async () => {
            const res = await request(app)
                .get('/api/notifications');

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/notifications/:id/read', () => {
        it('should mark a notification as read', async () => {
            const res = await request(app)
                .put(`/api/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Notification marked as read');
        });

        it('should return 404 for non-existent notification', async () => {
            const res = await request(app)
                .put('/api/notifications/99999/read')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/notifications/read-all', () => {
        it('should mark all notifications as read', async () => {
            const res = await request(app)
                .put('/api/notifications/read-all')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('All notifications marked as read');
        });
    });

    describe('DELETE /api/notifications/:id', () => {
        it('should delete a notification', async () => {
            const res = await request(app)
                .delete(`/api/notifications/${notificationId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Notification deleted');
        });

        it('should return 404 for non-existent notification', async () => {
            const res = await request(app)
                .delete('/api/notifications/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });
});
