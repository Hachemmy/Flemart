import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { sendMessage, clearConversation } from '../controllers/chat.controller';

const router = Router();

router.post('/', authenticateToken, sendMessage);
router.delete('/', authenticateToken, clearConversation);

export default router;
