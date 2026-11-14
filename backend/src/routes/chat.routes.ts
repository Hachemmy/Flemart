import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { chatLimiter } from '../middlewares/rateLimiters';
import { sendMessage, clearConversation } from '../controllers/chat.controller';

const router = Router();

router.post('/', authenticateToken, chatLimiter, sendMessage);
router.delete('/', authenticateToken, chatLimiter, clearConversation);

export default router;
