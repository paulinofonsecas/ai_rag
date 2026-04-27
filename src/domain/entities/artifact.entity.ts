export class Artifact {
    constructor(
        public readonly id: string,
        public readonly type: string,
        public readonly data: Record<string, any>,
        public readonly createdAt: Date,
        public readonly messageId?: string,
    ) { }
}
