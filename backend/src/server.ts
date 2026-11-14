import app from './app';
import { env } from './config/env';
import { startMotivationScheduler } from './scheduler/motivation.scheduler';
import { conversationManager } from './services/chat.service';

const PORT = env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startMotivationScheduler();
    setInterval(() => conversationManager.cleanupExpiredSessions(), 10 * 60 * 1000);
});
