import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import pool from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

let token: string;
let userId: number;
let otherUserId: number;
let otherToken: string;
let projectId: number;

beforeAll(async () => {
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create primary test user
    const [result1] = await pool.execute(
        'INSERT INTO Users (email, password, username) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        ['feed-test@example.com', hashedPassword, 'feed-testuser']
    );
    userId = (result1 as any).insertId;
    await pool.execute('UPDATE Users SET github_id = ? WHERE id = ?', ['gh-test-123', userId]);
    token = jwt.sign({ id: userId, email: 'feed-test@example.com', username: 'feed-testuser' }, JWT_SECRET, { expiresIn: '1h' });

    // Create secondary test user (for feed projects)
    const [result2] = await pool.execute(
        'INSERT INTO Users (email, password, username) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        ['feed-other@example.com', hashedPassword, 'feed-otheruser']
    );
    otherUserId = (result2 as any).insertId;
    otherToken = jwt.sign({ id: otherUserId, email: 'feed-other@example.com', username: 'feed-otheruser' }, JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
    if (projectId) {
        await pool.execute('DELETE FROM Likes WHERE project_id = ?', [projectId]);
        await pool.execute('DELETE FROM Projects WHERE id = ?', [projectId]);
    }
    await pool.execute('DELETE FROM Users WHERE id IN (?, ?)', [userId, otherUserId]);
    await pool.end();
});

describe('Feed Controller', () => {
    describe('GET /api/feed', () => {
        it('should return feed projects', async () => {
            const res = await request(app)
                .get('/api/feed')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('projects');
            expect(Array.isArray(res.body.projects)).toBe(true);
        });

        it('should return 401 without token', async () => {
            const res = await request(app)
                .get('/api/feed');

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/feed/:id/like', () => {
        beforeAll(async () => {
            const [result] = await pool.execute(
                'INSERT INTO Projects (user_id, title, status) VALUES (?, ?, ?)',
                [otherUserId, 'Feed Test Project', 'success']
            );
            projectId = (result as any).insertId;
        });

        it('should like a project', async () => {
            const res = await request(app)
                .post(`/api/feed/${projectId}/like`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('liked');
        });

        it('should unlike a project (toggle)', async () => {
            const res = await request(app)
                .post(`/api/feed/${projectId}/like`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.liked).toBe(false);
        });
    });

    describe('POST /api/feed/:id/resume', () => {
        let abandonedProjectId: number;

        beforeAll(async () => {
            const [result] = await pool.execute(
                'INSERT INTO Projects (user_id, title, status) VALUES (?, ?, ?)',
                [otherUserId, 'Abandoned Test Project', 'abandoned']
            );
            abandonedProjectId = (result as any).insertId;
        });

        afterAll(async () => {
            await pool.execute('DELETE FROM Projects WHERE id = ?', [abandonedProjectId]);
        });

        it('should resume an abandoned project', async () => {
            const res = await request(app)
                .post(`/api/feed/${abandonedProjectId}/resume`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Project resumed successfully');
        });

        it('should return 409 when trying to resume own project', async () => {
            const [result] = await pool.execute(
                'INSERT INTO Projects (user_id, title, status) VALUES (?, ?, ?)',
                [userId, 'My Own Abandoned', 'abandoned']
            );
            const ownProjectId = (result as any).insertId;

            const res = await request(app)
                .post(`/api/feed/${ownProjectId}/resume`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            await pool.execute('DELETE FROM Projects WHERE id = ?', [ownProjectId]);
        });
    });
});
