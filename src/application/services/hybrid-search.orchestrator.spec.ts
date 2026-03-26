import { Product } from 'src/domain/entities/product.entity';
import { EmbeddingService } from 'src/domain/interfaces/embedding-service.interface';
import { ResultReranker } from 'src/domain/interfaces/reranker.interface';
import { SearchRepository } from 'src/domain/interfaces/search-repository.interface';

import { HybridSearchOrchestrator } from './hybrid-search.orchestrator';

describe('HybridSearchOrchestrator', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const p1 = new Product('p1', 'Headphones', 'Noise cancelling', 'audio', now, now);
    const p2 = new Product('p2', 'Mouse', 'Gaming', 'peripherals', now, now);

    let repository: jest.Mocked<SearchRepository>;
    let embeddingService: jest.Mocked<EmbeddingService>;
    let reranker: jest.Mocked<ResultReranker>;

    beforeEach(() => {
        repository = {
            createProduct: jest.fn(),
            updateProductEmbedding: jest.fn(),
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
    });

    it('returns semantic results when embedding succeeds', async () => {
        repository.vectorSearch.mockResolvedValue([{ product: p2, rank: 1, score: 0.9 }]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker);
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
        expect(result).toHaveLength(1);
        expect(result[0].product.id).toBe('p2');
    });

    it('returns empty array when embedding fails', async () => {
        embeddingService.generateQueryEmbedding.mockRejectedValue(new Error('provider down'));

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker);
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
        expect(result).toHaveLength(0);
    });

    it('applies rerank output when rerank is enabled', async () => {
        repository.vectorSearch.mockResolvedValue([
            { product: p1, rank: 1, score: 0.8 },
            { product: p2, rank: 2, score: 0.9 }
        ]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);
        reranker.rerank.mockResolvedValue(['p2', 'p1']);

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, reranker);
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
});
