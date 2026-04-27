
import { Logger } from '@nestjs/common';
import { HybridSearchResult } from 'src/domain/interfaces/search-repository.interface';
import type { SearchOrchestratorInput } from './hybrid-search.types';
import { OnStep } from './hybrid-search.steps';
import { EmbeddingStep } from './embedding.step';
import { VectorSearchStep, VectorSearchInput } from './vector-search.step';
import { RerankStep, RerankInput } from './rerank.step';

export class HybridSearchOrchestrator {
    private readonly logger = new Logger(HybridSearchOrchestrator.name);
    private readonly embeddingStep: EmbeddingStep;
    private readonly vectorSearchStep: VectorSearchStep;
    private readonly rerankStep: RerankStep;

    constructor(
        embeddingStep: EmbeddingStep,
        vectorSearchStep: VectorSearchStep,
        rerankStep: RerankStep,
    ) {
        this.embeddingStep = embeddingStep;
        this.vectorSearchStep = vectorSearchStep;
        this.rerankStep = rerankStep;
    }

    async search(input: SearchOrchestratorInput, onStep?: OnStep): Promise<HybridSearchResult[]> {
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
            // Embedding step
            const embedding = await this.embeddingStep.execute({ query: input.query }, onStep);
            this.logger.log({
                msg: 'ai-search.embedding_completed',
                query: input.query,
                dimensions: embedding.length,
            });
            // Vector search step
            const fusedResults = await this.vectorSearchStep.execute({
                query: input.query,
                embedding,
                perMethodLimit: input.perMethodLimit ?? 10,
                rerankCandidates: input.rerankCandidates ?? 10,
                offset: input.offset ?? 0,
                rrfK: input.rrfK ?? 60,
            }, onStep);
            this.logger.log({
                msg: 'ai-search.semantic_completed',
                query: input.query,
                fusedCount: fusedResults.length,
            });
            if (!input.rerank || fusedResults.length === 0) {
                onStep?.({ type: 'step', step: 'rerank', status: 'skipped' });
                const result = fusedResults.slice(0, input.limit);
                this.logger.log({
                    msg: 'ai-search.returned_without_rerank',
                    query: input.query,
                    resultCount: result.length,
                    latencyMs: Date.now() - startedAt,
                });
                return result;
            }
            // Rerank step
            try {
                const reranked = await this.rerankStep.execute({
                    query: input.query,
                    candidates: fusedResults,
                    limit: input.limit,
                    rerankCandidates: input.rerankCandidates ?? 10,
                }, onStep);
                this.logger.log({
                    msg: 'ai-search.rerank_completed',
                    query: input.query,
                    rerankedCount: reranked.length,
                    latencyMs: Date.now() - startedAt,
                });
                return reranked;
            } catch (error) {
                onStep?.({ type: 'step', step: 'rerank', status: 'error' });
                this.logger.error({
                    msg: 'ai-search.rerank_failed_fallback_semantic',
                    query: input.query,
                    error: error instanceof Error ? error.message : 'unknown_error',
                });
                return fusedResults.slice(0, input.limit);
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
}
export { OnStep };

