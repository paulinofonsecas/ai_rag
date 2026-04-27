import { ChatSession } from './chat-session.entity';

describe('ChatSession', () => {
    it('should create a chat session with required fields', () => {
        const now = new Date();
        const session = new ChatSession('id', 'user', now);
        expect(session.id).toBe('id');
        expect(session.userId).toBe('user');
        expect(session.startedAt).toBe(now);
    });
});
