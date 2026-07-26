import { Router } from 'express';
import { register, login, getMe, updateProfile, githubAuth, githubLink, githubCallback } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfile);
router.get('/github', githubAuth);
router.post('/github/link', authenticateToken, githubLink);
router.get('/github/callback', githubCallback);

export default router;
