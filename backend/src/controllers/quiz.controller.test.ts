import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import pool from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required for tests');
}

const TEST_LANG = 'QuizTestLang';

let token: string;
let userId: number;
const questionIds: Record<number, number> = {};

async function startSession(level = 1, language = TEST_LANG) {
    return request(app)
        .get(`/api/quiz/${encodeURIComponent(language)}/questions?level=${level}`)
        .set('Authorization', `Bearer ${token}`);
}

async function answerQuestion(sessionId: string, questionId: number, answer = 'b') {
    return request(app)
        .post('/api/quiz/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ sessionId, questionId, answer });
}

async function completeSession(sessionId: string) {
    return request(app)
        .post('/api/quiz/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ sessionId });
}

beforeAll(async () => {
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const [result] = await pool.execute(
        'INSERT INTO Users (email, password, username) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        ['quiz-test@example.com', hashedPassword, 'quiz-testuser']
    );
    userId = (result as any).insertId;
    token = jwt.sign(
        { id: userId, email: 'quiz-test@example.com', username: 'quiz-testuser' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    await pool.execute('DELETE FROM QuizQuestions WHERE language = ?', [TEST_LANG]);
    for (const level of [1, 2, 3]) {
        const [qResult] = await pool.execute(
            'INSERT INTO QuizQuestions (language, difficulty_level, question, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [TEST_LANG, level, `Question ${level}?`, '3', '4', '5', '6', 'b']
        );
        questionIds[level] = (qResult as any).insertId;
    }
});

beforeEach(async () => {
    await pool.execute('DELETE FROM QuizSessions WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM QuizProgress WHERE user_id = ?', [userId]);
});

afterAll(async () => {
    await pool.execute('DELETE FROM QuizSessions WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM QuizProgress WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM QuizQuestions WHERE language = ?', [TEST_LANG]);
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
            expect(res.body.languages).toContain(TEST_LANG);
        });

        it('should return 401 without token', async () => {
            const res = await request(app).get('/api/quiz/languages');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/quiz/:language/questions', () => {
        it('should create a server session and never expose the correct answer', async () => {
            const res = await startSession(1);

            expect(res.status).toBe(200);
            expect(res.body.questions).toHaveLength(1);
            expect(typeof res.body.sessionId).toBe('string');
            expect(res.body.questions[0]).not.toHaveProperty('correct_answer');
        });

        it('should return 400 without level', async () => {
            const res = await request(app)
                .get(`/api/quiz/${TEST_LANG}/questions`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        it('should return 400 for invalid levels', async () => {
            for (const level of [0, 51, 999]) {
                const res = await startSession(level);
                expect(res.status).toBe(400);
            }
        });

        it('should return 401 without token', async () => {
            const res = await request(app).get(`/api/quiz/${TEST_LANG}/questions?level=1`);
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/quiz/answer', () => {
        it('should submit an answer and return only correctness', async () => {
            const session = await startSession(1);
            const res = await answerQuestion(session.body.sessionId, questionIds[1], 'b');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ correct: true });
        });

        it('should return wrong answer for incorrect response', async () => {
            const session = await startSession(1);
            const res = await answerQuestion(session.body.sessionId, questionIds[1], 'a');

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

        it('should reject a question outside the session', async () => {
            const session = await startSession(1);
            const res = await answerQuestion(session.body.sessionId, questionIds[2], 'b');

            expect(res.status).toBe(400);
        });

        it('should reject duplicate answers', async () => {
            const session = await startSession(1);
            await answerQuestion(session.body.sessionId, questionIds[1], 'b');
            const res = await answerQuestion(session.body.sessionId, questionIds[1], 'b');

            expect(res.status).toBe(409);
        });

        it('should return 401 without token', async () => {
            const res = await request(app)
                .post('/api/quiz/answer')
                .send({ sessionId: 'x', questionId: 1, answer: 'a' });

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/quiz/complete', () => {
        it('should compute the score server-side and award XP on first pass', async () => {
            const session = await startSession(1);
            await answerQuestion(session.body.sessionId, questionIds[1], 'b');

            const res = await completeSession(session.body.sessionId);

            expect(res.status).toBe(200);
            expect(res.body.passed).toBe(true);
            expect(res.body.score).toBe(1);
            expect(res.body.total).toBe(1);
            expect(res.body.xpEarned).toBe(5);
        });

        it('should return 400 without sessionId', async () => {
            const res = await request(app)
                .post('/api/quiz/complete')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
        });

        it('should return 400 when no answer was submitted', async () => {
            const session = await startSession(1);
            const res = await completeSession(session.body.sessionId);

            expect(res.status).toBe(400);
        });

        it('should return 409 when the session is already completed', async () => {
            const session = await startSession(1);
            await answerQuestion(session.body.sessionId, questionIds[1], 'b');
            await completeSession(session.body.sessionId);

            const res = await completeSession(session.body.sessionId);
            expect(res.status).toBe(409);
        });

        it('should return 401 without token', async () => {
            const res = await request(app)
                .post('/api/quiz/complete')
                .send({ sessionId: 'x' });

            expect(res.status).toBe(401);
        });
    });

    describe('Progressive level unlocking', () => {
        it('should reject completing a level before the previous one is validated', async () => {
            const session = await startSession(3);
            await answerQuestion(session.body.sessionId, questionIds[3], 'b');

            const res = await completeSession(session.body.sessionId);
            expect(res.status).toBe(403);
        });

        it('should unlock the next level only after the previous level is passed', async () => {
            const level1 = await startSession(1);
            await answerQuestion(level1.body.sessionId, questionIds[1], 'b');
            await completeSession(level1.body.sessionId);

            let res = await request(app)
                .get('/api/quiz/progress')
                .set('Authorization', `Bearer ${token}`);
            let prog = res.body.progress.find((p: any) => p.language === TEST_LANG);
            expect(prog.current_level).toBe(2);
            expect(prog.completed_levels).toBe(1);

            const skipped = await startSession(3);
            await answerQuestion(skipped.body.sessionId, questionIds[3], 'b');
            res = await completeSession(skipped.body.sessionId);
            expect(res.status).toBe(403);

            const level2 = await startSession(2);
            await answerQuestion(level2.body.sessionId, questionIds[2], 'b');
            res = await completeSession(level2.body.sessionId);
            expect(res.status).toBe(200);

            res = await request(app)
                .get('/api/quiz/progress')
                .set('Authorization', `Bearer ${token}`);
            prog = res.body.progress.find((p: any) => p.language === TEST_LANG);
            expect(prog.current_level).toBe(3);
            expect(prog.completed_levels).toBe(2);
        });

        it('should not inflate completed levels when replaying an already passed level', async () => {
            const first = await startSession(1);
            await answerQuestion(first.body.sessionId, questionIds[1], 'b');
            await completeSession(first.body.sessionId);

            const replay = await startSession(1);
            await answerQuestion(replay.body.sessionId, questionIds[1], 'b');
            const res = await completeSession(replay.body.sessionId);

            expect(res.status).toBe(200);
            expect(res.body.xpEarned).toBe(0);

            const progressRes = await request(app)
                .get('/api/quiz/progress')
                .set('Authorization', `Bearer ${token}`);
            const prog = progressRes.body.progress.find((p: any) => p.language === TEST_LANG);

            expect(prog.completed_levels).toBe(1);
            expect(prog.current_level).toBe(2);
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
            const res = await request(app).get('/api/quiz/progress');
            expect(res.status).toBe(401);
        });
    });
});
