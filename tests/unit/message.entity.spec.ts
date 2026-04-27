import { Message } from './message.entity';

describe('Message', () => {
    it('should create a message with required fields', () => {
        const now = new Date();
        const msg = new Message('id', 'session', 'sender', 'content', now);
        expect(msg.id).toBe('id');
        expect(msg.chatSessionId).toBe('session');
        expect(msg.sender).toBe('sender');
        expect(msg.content).toBe('content');
        expect(msg.sentAt).toBe(now);
    });
});
