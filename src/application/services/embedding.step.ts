import { EmbeddingService } from 'src/domain/interfaces/embedding-service.interface';
import { OnStep, SearchStep } from './hybrid-search.steps';

export class EmbeddingStep implements SearchStep<{ query: string }, number[]> {
    constructor(private readonly embeddingService: EmbeddingService) {}

    async execute(input: { query: string }, onStep?: OnStep): Promise<number[]> {
        onStep?.({ type: 'step', step: 'embedding', status: 'started' });
        const start = Date.now();
        const embedding = await this.embeddingService.generateQueryEmbedding(input.query);
        onStep?.({ type: 'step', step: 'embedding', status: 'completed', durationMs: Date.now() - start });
        return embedding;
    }
}
