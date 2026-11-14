import { Router } from 'express';
import {
    getLearningResources,
    getLearningResourceById,
    searchSolution
} from '../controllers/learning.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { searchLimiter } from '../middlewares/rateLimiters';

const router = Router();

router.post('/search', authenticateToken, searchLimiter, searchSolution);
router.get('/', getLearningResources);
router.get('/:id', getLearningResourceById);

export default router;
