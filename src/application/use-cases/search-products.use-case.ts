import { HybridSearchOrchestrator } from 'src/application/services/hybrid-search.orchestrator';

export type SearchProductsInput = {
    query: string;
    limit?: number;
    offset?: number;
    rrfK?: number;
};

export class SearchProductsUseCase {
    constructor(private readonly orchestrator: HybridSearchOrchestrator) { }

    async execute(input: SearchProductsInput) {
        const normalizedInput = {
            query: input.query,
            limit: input.limit ?? 10,
            offset: input.offset ?? 0,
            rrfK: input.rrfK ?? 60,
            perMethodLimit: Math.max(25, input.limit ?? 10),
        };

        return this.orchestrator.search(normalizedInput);
    }
}
