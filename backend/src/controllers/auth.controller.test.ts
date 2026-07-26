import request from 'supertest';
import app from '../app';
import pool from '../config/database';

describe('Auth Controller', () => {
    afterAll(async () => {
        await pool.execute('DELETE FROM Users WHERE email = ?', ['test@example.com']);
        await pool.end();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    confirmPassword: 'password123',
                    username: 'testuser'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe('test@example.com');
        });

        it('should return 409 if user already exists', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    confirmPassword: 'password123',
                    username: 'testuser'
                });

            expect(res.status).toBe(409);
        });

        it('should return 400 for invalid email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'password123',
                    username: 'testuser'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login an existing user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('user');
        });

        it('should return 401 for invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                });

            expect(res.status).toBe(401);
        });
    });
});
