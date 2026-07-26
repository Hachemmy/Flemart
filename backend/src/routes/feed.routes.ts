import { Router } from 'express';
import { getFeed, toggleLike, resumeProject } from '../controllers/feed.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getFeed);
router.post('/:id/like', authenticateToken, toggleLike);
router.post('/:id/resume', authenticateToken, resumeProject);

export default router;
