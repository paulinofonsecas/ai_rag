import { SearchRepository, HybridSearchResult } from 'src/domain/interfaces/search-repository.interface';
import { RrfService } from './rrf.service';
import { OnStep, SearchStep } from './hybrid-search.steps';

export interface VectorSearchInput {
    query: string;
    embedding: number[];
    perMethodLimit: number;
    rerankCandidates: number;
    offset: number;
    rrfK: number;
}

export class VectorSearchStep implements SearchStep<VectorSearchInput, HybridSearchResult[]> {
    constructor(
        private readonly repository: SearchRepository,
        private readonly rrfService: RrfService,
    ) {}

    async execute(input: VectorSearchInput, onStep?: OnStep): Promise<HybridSearchResult[]> {
        onStep?.({ type: 'step', step: 'vector_search', status: 'started' });
        const vsStart = Date.now();
        const [semanticResults, lexicalResults] = await Promise.all([
            this.repository.vectorSearch(
                input.embedding,
                Math.max(input.perMethodLimit, input.rerankCandidates),
                input.offset,
            ),
            this.repository.lexicalSearch(
                input.query,
                Math.max(input.perMethodLimit, input.rerankCandidates),
                input.offset,
            ),
        ]);
        const fusedResults = this.rrfService.fuse(semanticResults, lexicalResults, input.rrfK);
        onStep?.({
            type: 'step',
            step: 'vector_search',
            status: 'completed',
            durationMs: Date.now() - vsStart,
            meta: {
                semanticCount: semanticResults.length,
                lexicalCount: lexicalResults.length,
                fusedCount: fusedResults.length,
                preRerankResults: fusedResults.slice(0, Math.max(input.perMethodLimit, input.rerankCandidates)),
            },
        });
        return fusedResults;
    }
}
