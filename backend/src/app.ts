import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import notificationRoutes from './routes/notification.routes';
import learningRoutes from './routes/learning.routes';
import languageRoutes from './routes/language.routes';
import quizRoutes from './routes/quiz.routes';
import feedRoutes from './routes/feed.routes';
import chatRoutes from './routes/chat.routes';
import { errorHandler } from './middlewares/error.middleware';
import { apiLimiter, notificationLimiter } from './middlewares/rateLimiters';

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting
app.use('/api/notifications', notificationLimiter);
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

export default app;
