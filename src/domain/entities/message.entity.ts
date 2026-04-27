export class Message {
    constructor(
        public readonly id: string,
        public readonly chatSessionId: string,
        public readonly sender: string,
        public readonly content: string,
        public readonly sentAt: Date,
        public readonly messageType: string = 'user',
        public readonly productId?: string,
        public readonly artifactId?: string,
    ) { }
}
