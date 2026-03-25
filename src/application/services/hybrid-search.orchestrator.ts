import { Logger } from '@nestjs/common';

import { EmbeddingService } from 'src/domain/interfaces/embedding-service.interface';
import {
    HybridSearchResult,
    SearchRepository,
} from 'src/domain/interfaces/search-repository.interface';

import { RrfService } from './rrf.service';

export type SearchOrchestratorInput = {
    query: string;
    limit: number;
    offset: number;
    rrfK: number;
    perMethodLimit: number;
};

export class HybridSearchOrchestrator {
    constructor(
        private readonly repository: SearchRepository,
        private readonly embeddingService: EmbeddingService,
        private readonly rrfService: RrfService,
        private readonly logger = new Logger(HybridSearchOrchestrator.name),
    ) { }


    async search(input: SearchOrchestratorInput): Promise<HybridSearchResult[]> {
        this.logger.log({
            msg: 'hybrid-search.started',
            query: input.query,
            limit: input.limit,
            offset: input.offset,
            rrfK: input.rrfK,
            perMethodLimit: input.perMethodLimit,
        });

        const lexicalResults = await this.repository.lexicalSearch(
            input.query,
            input.perMethodLimit,
            input.offset,
        );

        try {
            const embedding = await this.embeddingService.generateQueryEmbedding(input.query);

            const semanticResults = await this.repository.vectorSearch(
                embedding,
                input.perMethodLimit,
                input.offset,
            );

            const fusedResults = this.rrfService
                .fuse(semanticResults, lexicalResults, input.rrfK)
                .slice(0, input.limit);

            this.logger.log({
                msg: 'hybrid-search.completed',
                query: input.query,
                rrfK: input.rrfK,
                lexicalCount: lexicalResults.length,
                semanticCount: semanticResults.length,
                resultCount: fusedResults.length,
            });

            return fusedResults;
        } catch (error) {
            const fallbackResults = lexicalResults.slice(0, input.limit).map<HybridSearchResult>((item) => ({
                product: item.product,
                semanticRank: undefined,
                lexicalRank: item.rank,
                semanticScore: undefined,
                lexicalScore: item.score,
                rrfScore: 1 / (input.rrfK + item.rank),
            }));

            this.logger.error({
                msg: 'hybrid-search.semantic_failed_fallback_lexical',
                query: input.query,
                lexicalCount: lexicalResults.length,
                resultCount: fallbackResults.length,
                error: error instanceof Error ? error.message : 'unknown_error',
            });

            return fallbackResults;
        }
    }
}
