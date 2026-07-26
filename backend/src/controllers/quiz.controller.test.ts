import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import pool from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

let token: string;
let userId: number;
let questionId: number;

beforeAll(async () => {
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const [result] = await pool.execute(
        'INSERT INTO Users (email, password, username) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        ['quiz-test@example.com', hashedPassword, 'quiz-testuser']
    );
    userId = (result as any).insertId;
    token = jwt.sign({ id: userId, email: 'quiz-test@example.com', username: 'quiz-testuser' }, JWT_SECRET, { expiresIn: '1h' });

    // Seed a test question
    const [qResult] = await pool.execute(
        'INSERT INTO QuizQuestions (language, difficulty_level, question, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['JavaScript', 1, 'What is 2+2?', '3', '4', '5', '6', 'b']
    );
    questionId = (qResult as any).insertId;
});

afterAll(async () => {
    if (questionId) {
        await pool.execute('DELETE FROM QuizQuestions WHERE id = ?', [questionId]);
    }
    await pool.execute('DELETE FROM QuizProgress WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM Users WHERE id = ?', [userId]);
    await pool.end();
});

describe('Quiz Controller', () => {
    describe('GET /api/quiz/languages', () => {
        it('should return available quiz languages', async () => {
            const res = await request(app)
                .get('/api/quiz/languages')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('languages');
            expect(Array.isArray(res.body.languages)).toBe(true);
        });

        it('should return 401 without token', async () => {
            const res = await request(app)
                .get('/api/quiz/languages');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/quiz/:language/questions', () => {
        it('should return quiz questions for a language', async () => {
            const res = await request(app)
                .get('/api/quiz/JavaScript/questions?level=1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('questions');
        });

        it('should return 400 without level', async () => {
            const res = await request(app)
                .get('/api/quiz/JavaScript/questions')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        it('should return 400 for invalid level', async () => {
            const res = await request(app)
                .get('/api/quiz/JavaScript/questions?level=999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/quiz/answer', () => {
        it('should submit an answer and return correctness', async () => {
            const res = await request(app)
                .post('/api/quiz/answer')
                .set('Authorization', `Bearer ${token}`)
                .send({ questionId, answer: 'b' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('correct');
            expect(res.body.correct).toBe(true);
            expect(res.body.correctAnswer).toBe('b');
        });

        it('should return wrong answer for incorrect response', async () => {
            const res = await request(app)
                .post('/api/quiz/answer')
                .set('Authorization', `Bearer ${token}`)
                .send({ questionId, answer: 'a' });

            expect(res.status).toBe(200);
            expect(res.body.correct).toBe(false);
        });

        it('should return 400 without required fields', async () => {
            const res = await request(app)
                .post('/api/quiz/answer')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/quiz/complete', () => {
        it('should complete a quiz level', async () => {
            const res = await request(app)
                .post('/api/quiz/complete')
                .set('Authorization', `Bearer ${token}`)
                .send({ language: 'JavaScript', level: 1, score: 8 });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('passed');
            expect(res.body).toHaveProperty('xpEarned');
        });

        it('should return 400 without required fields', async () => {
            const res = await request(app)
                .post('/api/quiz/complete')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
        });

        it('should return 401 without token', async () => {
            const res = await request(app)
                .post('/api/quiz/complete')
                .send({ language: 'JavaScript', level: 1, score: 8 });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/quiz/progress', () => {
        it('should return quiz progress for authenticated user', async () => {
            const res = await request(app)
                .get('/api/quiz/progress')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('progress');
            expect(Array.isArray(res.body.progress)).toBe(true);
        });

        it('should return 401 without token', async () => {
            const res = await request(app)
                .get('/api/quiz/progress');

            expect(res.status).toBe(401);
        });
    });
});
