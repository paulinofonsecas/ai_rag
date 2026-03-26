import { Logger } from '@nestjs/common';

import { HybridSearchOrchestrator } from 'src/application/services/hybrid-search.orchestrator';

export type SearchProductsInput = {
    query: string;
    limit?: number;
    offset?: number;
    rrfK?: number;
    rerank?: boolean;
    rerankCandidates?: number;
};

export class SearchProductsUseCase {
    private readonly logger = new Logger(SearchProductsUseCase.name);

    constructor(private readonly orchestrator: HybridSearchOrchestrator) { }

    async execute(input: SearchProductsInput) {
        const limit = input.limit ?? 10;
        const perMethodLimit = Math.min(100, Math.max(25, limit * 5));

        const normalizedInput = {
            query: input.query,
            limit,
            offset: input.offset ?? 0,
            rrfK: input.rrfK ?? 60,
            perMethodLimit,
            rerank: input.rerank ?? true,
            rerankCandidates: input.rerankCandidates ?? Math.min(40, perMethodLimit),
        };

        this.logger.log({
            msg: 'search-products.normalized_input',
            query: normalizedInput.query,
            limit: normalizedInput.limit,
            offset: normalizedInput.offset,
            rrfK: normalizedInput.rrfK,
            perMethodLimit: normalizedInput.perMethodLimit,
            rerank: normalizedInput.rerank,
            rerankCandidates: normalizedInput.rerankCandidates,
        });

        return this.orchestrator.search(normalizedInput);
    }
}
