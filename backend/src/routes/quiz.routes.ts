import { Router } from 'express';
import {
    getQuizLanguages,
    getQuizQuestions,
    submitQuizAnswer,
    completeQuizLevel,
    getQuizProgress,
} from '../controllers/quiz.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/languages', authenticateToken, getQuizLanguages);
router.get('/:language/questions', authenticateToken, getQuizQuestions);
router.post('/answer', authenticateToken, submitQuizAnswer);
router.post('/complete', authenticateToken, completeQuizLevel);
router.get('/progress', authenticateToken, getQuizProgress);

export default router;
