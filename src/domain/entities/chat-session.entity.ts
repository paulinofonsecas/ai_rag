export class ChatSession {
    constructor(
        public readonly id: string,
        public readonly userId: string | null,
        public readonly startedAt: Date,
        public readonly endedAt?: Date,
        public readonly metadata?: Record<string, any>,
    ) { }
}
