import { HybridSearchResult } from 'src/domain/interfaces/search-repository.interface';
import { ResultReranker } from 'src/domain/interfaces/reranker.interface';
import { OnStep, SearchStep } from './hybrid-search.steps';

export interface RerankInput {
    query: string;
    candidates: HybridSearchResult[];
    limit: number;
    rerankCandidates: number;
}

export class RerankStep implements SearchStep<RerankInput, HybridSearchResult[]> {
    constructor(private readonly reranker: ResultReranker) {}

    async execute(input: RerankInput, onStep?: OnStep): Promise<HybridSearchResult[]> {
        onStep?.({ type: 'step', step: 'rerank', status: 'started' });
        const rrStart = Date.now();
        const candidates = input.candidates.slice(0, Math.max(input.limit, input.rerankCandidates));
        const rerankedIds = await this.reranker.rerank(input.query, candidates);
        const byId = new Map(candidates.map((item) => [item.product.id, item]));
        const rerankedItems: HybridSearchResult[] = [];
        const used = new Set<string>();
        for (const id of rerankedIds) {
            const item = byId.get(id);
            if (!item || used.has(id)) continue;
            used.add(id);
            rerankedItems.push(item);
        }
        onStep?.({
            type: 'step',
            step: 'rerank',
            status: 'completed',
            durationMs: Date.now() - rrStart,
            meta: { count: rerankedItems.length },
        });
        return rerankedItems.slice(0, input.limit);
    }
}
