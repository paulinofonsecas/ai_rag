import { Logger } from '@nestjs/common';

import { EmbeddingService } from 'src/domain/interfaces/embedding-service.interface';
import { ResultReranker } from 'src/domain/interfaces/reranker.interface';
import {
    HybridSearchResult,
    SearchRepository,
} from 'src/domain/interfaces/search-repository.interface';

export type SearchOrchestratorInput = {
    query: string;
    limit: number;
    offset: number;
    rrfK: number;
    perMethodLimit: number;
    rerank: boolean;
    rerankCandidates: number;
};

export class HybridSearchOrchestrator {
    constructor(
        private readonly repository: SearchRepository,
        private readonly embeddingService: EmbeddingService,
        private readonly reranker: ResultReranker,
        private readonly logger = new Logger(HybridSearchOrchestrator.name),
    ) { }

    async search(input: SearchOrchestratorInput): Promise<HybridSearchResult[]> {
        const startedAt = Date.now();

        this.logger.log({
            msg: 'ai-search.started',
            query: input.query,
            limit: input.limit,
            offset: input.offset,
            perMethodLimit: input.perMethodLimit,
            rerank: input.rerank,
            rerankCandidates: input.rerankCandidates,
        });

        try {
            const embedding = await this.embeddingService.generateQueryEmbedding(input.query);

            this.logger.log({
                msg: 'ai-search.embedding_completed',
                query: input.query,
                dimensions: embedding.length,
            });

            const semanticResults = await this.repository.vectorSearch(
                embedding,
                Math.max(input.perMethodLimit, input.rerankCandidates),
                input.offset,
            );

            this.logger.log({
                msg: 'ai-search.semantic_completed',
                query: input.query,
                semanticCount: semanticResults.length,
            });

            const aiPrioritizedResults = semanticResults.map((item, i) => ({ ...item, semanticRank: i + 1 }));

            if (!input.rerank || semanticResults.length === 0) {
                const result = aiPrioritizedResults.slice(0, input.limit);

                this.logger.log({
                    msg: 'ai-search.returned_without_rerank',
                    query: input.query,
                    resultCount: result.length,
                    latencyMs: Date.now() - startedAt,
                });

                return result;
            }

            try {
                const reranked = await this.applyGeminiRerank(aiPrioritizedResults, input);

                this.logger.log({
                    msg: 'ai-search.rerank_completed',
                    query: input.query,
                    rerankedCount: reranked.length,
                    latencyMs: Date.now() - startedAt,
                });

                return reranked;
            } catch (error) {
                this.logger.error({
                    msg: 'ai-search.rerank_failed_fallback_semantic',
                    query: input.query,
                    error: error instanceof Error ? error.message : 'unknown_error',
                });

                return aiPrioritizedResults.slice(0, input.limit);
            }
        } catch (error) {
            this.logger.error({
                msg: 'ai-search.semantic_search_failed',
                query: input.query,
                error: error instanceof Error ? error.message : 'unknown_error',
                latencyMs: Date.now() - startedAt,
            });

            return [];
        }
    }

    private async applyGeminiRerank(
        semanticResults: HybridSearchResult[],
        input: SearchOrchestratorInput,
    ): Promise<HybridSearchResult[]> {
        const candidates = semanticResults.slice(0, Math.max(input.limit, input.rerankCandidates));

        this.logger.log({
            msg: 'ai-search.rerank_started',
            query: input.query,
            candidateCount: candidates.length,
        });

        const rerankedIds = await this.reranker.rerank(input.query, candidates);

        if (rerankedIds.length === 0) {
            this.logger.log({
                msg: 'ai-search.rerank_filtered_all',
                query: input.query,
                candidateCount: candidates.length,
            });

            return [];
        }

        const byId = new Map(semanticResults.map((item) => [item.product.id, item]));
        const rerankedItems: HybridSearchResult[] = [];
        const used = new Set<string>();

        for (const id of rerankedIds) {
            const item = byId.get(id);
            if (!item || used.has(id)) {
                continue;
            }

            used.add(id);
            rerankedItems.push(item);
        }

        return rerankedItems.slice(0, input.limit);
    }
}
