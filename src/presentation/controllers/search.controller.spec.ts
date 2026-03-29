import { SearchProductsUseCase } from 'src/application/use-cases/search-products.use-case';
import { Product } from 'src/domain/entities/product.entity';
import { SearchQueryDto } from 'src/presentation/dto/search-query.dto';

import { SearchController } from './search.controller';

describe('SearchController', () => {
    it('maps use-case results into normalized API output', async () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const product = new Product('p1', 'Headphones', 'Noise cancelling', 'audio', now, now);

        const useCase: jest.Mocked<SearchProductsUseCase> = {
            execute: jest.fn().mockResolvedValue([
                {
                    product,
                    rrfScore: 0.2,
                    semanticScore: 0.8,
                    lexicalScore: 0.7,
                    semanticRank: 1,
                    lexicalRank: 2,
                },
            ]),
        } as unknown as jest.Mocked<SearchProductsUseCase>;

        const searchRepository = {
            getAllProducts: jest.fn(),
        } as any;
        const postgresService = {} as any;
        const searchHistoryStore = { append: jest.fn() } as any;

        const controller = new SearchController(useCase, searchRepository, postgresService, searchHistoryStore);

        const query: SearchQueryDto = {
            q: 'headphones',
            limit: 10,
            offset: 0,
            rrfK: 60,
            rerank: true,
            rerankCandidates: 30,
        };

        const output = await controller.search(query, 'cid-123');

        expect(useCase.execute).toHaveBeenCalledWith({
            query: 'headphones',
            limit: 10,
            offset: 0,
            rrfK: 60,
            rerank: true,
            rerankCandidates: 30,
        });
        expect(output.query).toBe('headphones');
        expect(output.count).toBe(1);
        expect(output.items[0].id).toBe('p1');
        expect(output.items[0].scores.rrf).toBe(0.2);
    });

    it('returns items ordered by ranking', async () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const productA = new Product('p-a', 'A', 'A', 'bebidas', now, now);
        const productB = new Product('p-b', 'B', 'B', 'bebidas', now, now);
        const productC = new Product('p-c', 'C', 'C', 'bebidas', now, now);

        const useCase: jest.Mocked<SearchProductsUseCase> = {
            execute: jest.fn().mockResolvedValue([
                { product: productB, semanticRank: 1 },
                { product: productC, semanticRank: 2 },
                { product: productA, semanticRank: 4 },
            ]),
        } as unknown as jest.Mocked<SearchProductsUseCase>;

        const searchRepository = {
            getAllProducts: jest.fn(),
        } as any;
        const postgresService = {} as any;
        const searchHistoryStore = { append: jest.fn() } as any;

        const controller = new SearchController(useCase, searchRepository, postgresService, searchHistoryStore);

        const output = await controller.search({ q: 'coisas para ficar bebado' }, 'cid-999');

        expect(output.items.map((item) => item.id)).toEqual(['p-b', 'p-c', 'p-a']);
    });
});
