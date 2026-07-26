import app from './app';
import dotenv from 'dotenv';
import { startMotivationScheduler } from './scheduler/motivation.scheduler';
import { conversationManager } from './services/chat.service';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startMotivationScheduler();
    setInterval(() => conversationManager.cleanupExpiredSessions(), 10 * 60 * 1000);
});
