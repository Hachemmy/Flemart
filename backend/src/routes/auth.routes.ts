import { Router } from 'express';
import {
    register,
    login,
    getMe,
    updateProfile,
    githubAuth,
    githubLink,
    githubCallback,
    exchangeOAuthCode,
} from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rateLimiters';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/oauth/exchange', authLimiter, exchangeOAuthCode);
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfile);
router.get('/github', authLimiter, githubAuth);
router.post('/github/link', authenticateToken, githubLink);
router.get('/github/callback', authLimiter, githubCallback);

export default router;
