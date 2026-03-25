import { Product } from 'src/domain/entities/product.entity';
import { EmbeddingService } from 'src/domain/interfaces/embedding-service.interface';
import { SearchRepository } from 'src/domain/interfaces/search-repository.interface';

import { HybridSearchOrchestrator } from './hybrid-search.orchestrator';
import { RrfService } from './rrf.service';

describe('HybridSearchOrchestrator', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const p1 = new Product('p1', 'Headphones', 'Noise cancelling', 'audio', now, now);
    const p2 = new Product('p2', 'Mouse', 'Gaming', 'peripherals', now, now);

    let repository: jest.Mocked<SearchRepository>;
    let embeddingService: jest.Mocked<EmbeddingService>;

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
    });

    it('returns hybrid fused results when embedding succeeds', async () => {
        repository.lexicalSearch.mockResolvedValue([{ product: p1, rank: 1, score: 0.8 }]);
        repository.vectorSearch.mockResolvedValue([{ product: p2, rank: 1, score: 0.9 }]);
        embeddingService.generateQueryEmbedding.mockResolvedValue([0.1, 0.2]);

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, new RrfService());

        const result = await orchestrator.search({
            query: 'best gaming setup',
            limit: 10,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
        });

        expect(embeddingService.generateQueryEmbedding).toHaveBeenCalledWith('best gaming setup');
        expect(repository.vectorSearch).toHaveBeenCalledWith([0.1, 0.2], 25, 0);
        expect(result).toHaveLength(2);
    });

    it('falls back to lexical only when embedding fails', async () => {
        repository.lexicalSearch.mockResolvedValue([
            { product: p1, rank: 1, score: 0.8 },
            { product: p2, rank: 2, score: 0.7 },
        ]);
        embeddingService.generateQueryEmbedding.mockRejectedValue(new Error('provider down'));

        const orchestrator = new HybridSearchOrchestrator(repository, embeddingService, new RrfService());

        const result = await orchestrator.search({
            query: 'wireless',
            limit: 1,
            offset: 0,
            rrfK: 60,
            perMethodLimit: 25,
        });

        expect(repository.vectorSearch).not.toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0].lexicalScore).toBe(0.8);
        expect(result[0].semanticScore).toBeUndefined();
    });
});
