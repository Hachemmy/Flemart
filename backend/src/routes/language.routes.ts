import { Router } from 'express';
import { getMyLanguages } from '../controllers/language.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', authenticateToken, getMyLanguages);

export default router;
