import { Product } from 'src/domain/entities/product.entity';
import { EmbeddingService } from 'src/domain/interfaces/embedding-service.interface';
import { ResultReranker } from 'src/domain/interfaces/reranker.interface';
import { SearchRepository } from 'src/domain/interfaces/search-repository.interface';

import { HybridSearchOrchestrator, OnStep, StepEvent } from './hybrid-search.orchestrator';
import { RrfService } from './rrf.service';

describe('HybridSearchOrchestrator', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const p1 = new Product('p1', 'Headphones', 'Noise cancelling', 'audio', now, now);
    const p2 = new Product('p2', 'Mouse', 'Gaming', 'peripherals', now, now);

    let repository: jest.Mocked<SearchRepository>;
    let embeddingService: jest.Mocked<EmbeddingService>;
    let reranker: jest.Mocked<ResultReranker>;
    let rrfService: RrfService;

    beforeEach(() => {
        repository = {
            createProduct: jest.fn(),
            updateProductEmbedding: jest.fn(),
            getAllProducts: jest.fn(),
            vectorSearch: jest.fn(),
            lexicalSearch: jest.fn(),
        };

        embeddingService = {
            generateProductEmbedding: jest.fn(),
            generateQueryEmbedding: jest.fn(),
        };

        reranker = {
            rerank: jest.fn(),
        };

        rrfService = new RrfService();
    });

    it('returns fused results when embedding succeeds', async () => {
        repository.vectorSearch.mockResolvedValue([{ product: p2, rank: 1, score: 0.9 }]);
        repository.lexicalSearch.mockResolvedValue([{ product: p2, rank: 1, score: 0.7 }]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        const result = await orchestrator.search({
            query: 'best gaming setup',
            limit: 10,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
            rerank: false,
            rerankCandidates: 25,
        });

        expect(embeddingService.generateQueryEmbedding).toHaveBeenCalledWith('best gaming setup');
        expect(repository.vectorSearch).toHaveBeenCalledWith([0.1, 0.2], 25, 0);
        expect(repository.lexicalSearch).toHaveBeenCalledWith('best gaming setup', 25, 0);
        expect(result).toHaveLength(1);
        expect(result[0].product.id).toBe('p2');
        expect(result[0].rrfScore).toBeDefined();
    });

    it('returns empty array when embedding fails', async () => {
        embeddingService.generateQueryEmbedding.mockRejectedValue(new Error('provider down'));

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        const result = await orchestrator.search({
            query: 'wireless',
            limit: 1,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
            rerank: true,
            rerankCandidates: 25,
        });

        expect(repository.vectorSearch).not.toHaveBeenCalled();
        expect(repository.lexicalSearch).not.toHaveBeenCalled();
        expect(result).toHaveLength(0);
    });

    it('applies rerank output when rerank is enabled', async () => {
        repository.vectorSearch.mockResolvedValue([
            { product: p1, rank: 1, score: 0.8 },
            { product: p2, rank: 2, score: 0.9 }
        ]);
        repository.lexicalSearch.mockResolvedValue([
            { product: p2, rank: 1, score: 0.95 },
            { product: p1, rank: 2, score: 0.4 }
        ]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);
        reranker.rerank.mockResolvedValue(['p2', 'p1']);

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        const result = await orchestrator.search({
            query: 'best gaming setup',
            limit: 10,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
            rerank: true,
            rerankCandidates: 25,
        });

        expect(reranker.rerank).toHaveBeenCalledTimes(1);
        expect(result[0].product.id).toBe('p2');
        expect(result[1].product.id).toBe('p1');
    });

    it('returns empty result when AI reranker filters all candidates', async () => {
        repository.vectorSearch.mockResolvedValue([
            { product: p1, rank: 1, score: 0.8 },
            { product: p2, rank: 2, score: 0.9 }
        ]);
        repository.lexicalSearch.mockResolvedValue([
            { product: p1, rank: 1, score: 0.7 },
            { product: p2, rank: 2, score: 0.6 }
        ]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);
        reranker.rerank.mockResolvedValue([]);

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        const result = await orchestrator.search({
            query: 'query sem correlacao',
            limit: 10,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
            rerank: true,
            rerankCandidates: 25,
        });

        expect(reranker.rerank).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);
    });

    it('falls back to fused results (sliced to limit) when reranker throws', async () => {
        repository.vectorSearch.mockResolvedValue([
            { product: p1, rank: 1, score: 0.8 },
            { product: p2, rank: 2, score: 0.7 },
        ]);
        repository.lexicalSearch.mockResolvedValue([
            { product: p1, rank: 1, score: 0.9 },
        ]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);
        reranker.rerank.mockRejectedValue(new Error('reranker timeout'));

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        const result = await orchestrator.search({
            query: 'headphones',
            limit: 1,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
            rerank: true,
            rerankCandidates: 25,
        });

        // Falls back to fused slice(0, limit=1)
        expect(result).toHaveLength(1);
        expect(reranker.rerank).toHaveBeenCalledTimes(1);
    });

    it('skips rerank step and returns sliced fused results when rerank=false', async () => {
        repository.vectorSearch.mockResolvedValue([
            { product: p1, rank: 1, score: 0.9 },
            { product: p2, rank: 2, score: 0.8 },
        ]);
        repository.lexicalSearch.mockResolvedValue([
            { product: p2, rank: 1, score: 0.95 },
        ]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.5, 0.5]);

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        const result = await orchestrator.search({
            query: 'test',
            limit: 1,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
            rerank: false,
            rerankCandidates: 25,
        });

        expect(reranker.rerank).not.toHaveBeenCalled();
        expect(result).toHaveLength(1);
    });

    it('skips rerank and returns empty when fused results are empty', async () => {
        repository.vectorSearch.mockResolvedValue([]);
        repository.lexicalSearch.mockResolvedValue([]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        const result = await orchestrator.search({
            query: 'nothing',
            limit: 10,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
            rerank: true,
            rerankCandidates: 25,
        });

        expect(reranker.rerank).not.toHaveBeenCalled();
        expect(result).toEqual([]);
    });

    it('fires onStep callbacks for embedding, vector_search, and rerank steps', async () => {
        repository.vectorSearch.mockResolvedValue([{ product: p1, rank: 1, score: 0.9 }]);
        repository.lexicalSearch.mockResolvedValue([{ product: p1, rank: 1, score: 0.8 }]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);
        reranker.rerank.mockResolvedValue(['p1']);

        const events: StepEvent[] = [];
        const onStep: OnStep = (e) => events.push(e);

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        await orchestrator.search(
            {
                query: 'headphones',
                limit: 10,
                offset: 0,
                rrfK: 60,
                perMethodLimit: 25,
                rerank: true,
                rerankCandidates: 25,
            },
            onStep,
        );

        const steps = events.map((e) => `${e.step}:${e.status}`);
        expect(steps).toContain('embedding:started');
        expect(steps).toContain('embedding:completed');
        expect(steps).toContain('vector_search:started');
        expect(steps).toContain('vector_search:completed');
        expect(steps).toContain('rerank:started');
        expect(steps).toContain('rerank:completed');
    });

    it('fires rerank:skipped onStep when rerank=false', async () => {
        repository.vectorSearch.mockResolvedValue([{ product: p1, rank: 1, score: 0.9 }]);
        repository.lexicalSearch.mockResolvedValue([]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);

        const events: StepEvent[] = [];
        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        await orchestrator.search(
            {
                query: 'test',
                limit: 10,
                offset: 0,
                rrfK: 60,
                perMethodLimit: 25,
                rerank: false,
                rerankCandidates: 25,
            },
            (e) => events.push(e),
        );

        expect(events.some((e) => e.step === 'rerank' && e.status === 'skipped')).toBe(true);
    });

    it('deduplicates ids returned by the reranker', async () => {
        repository.vectorSearch.mockResolvedValue([
            { product: p1, rank: 1, score: 0.9 },
            { product: p2, rank: 2, score: 0.8 },
        ]);
        repository.lexicalSearch.mockResolvedValue([]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);
        // Reranker returns p1 twice — should be deduplicated
        reranker.rerank.mockResolvedValue(['p1', 'p1', 'p2']);

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        const result = await orchestrator.search({
            query: 'headphones',
            limit: 10,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
            rerank: true,
            rerankCandidates: 25,
        });

        const ids = result.map((r) => r.product.id);
        expect(ids.filter((id) => id === 'p1')).toHaveLength(1);
        expect(ids).toContain('p2');
    });

    it('falls back to fused slice when reranker throws a non-Error value', async () => {
        // Covers the 'unknown_error' branch (error instanceof Error ? ... : 'unknown_error') in rerank catch
        repository.vectorSearch.mockResolvedValue([{ product: p1, rank: 1, score: 0.8 }]);
        repository.lexicalSearch.mockResolvedValue([]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);
        reranker.rerank.mockRejectedValue('plain string error');

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        const result = await orchestrator.search({
            query: 'headphones',
            limit: 5,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
            rerank: true,
            rerankCandidates: 25,
        });

        expect(result).toHaveLength(1);
    });

    it('returns empty array when embedding service throws a non-Error value', async () => {
        // Covers the 'unknown_error' branch in the outer catch (ai-search.semantic_search_failed)
        embeddingService.generateQueryEmbedding.mockRejectedValue('non-error rejection');

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker, rrfService);
        const result = await orchestrator.search({
            query: 'wireless',
            limit: 5,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
            rerank: true,
            rerankCandidates: 25,
        });

        expect(repository.vectorSearch).not.toHaveBeenCalled();
        expect(result).toEqual([]);
    });
});

