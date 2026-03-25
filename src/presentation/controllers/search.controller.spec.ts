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

    const controller = new SearchController(useCase);

    const query: SearchQueryDto = {
      q: 'headphones',
      limit: 10,
      offset: 0,
      rrfK: 60,
    };

    const output = await controller.search(query, 'cid-123');

    expect(useCase.execute).toHaveBeenCalledWith({
      query: 'headphones',
      limit: 10,
      offset: 0,
      rrfK: 60,
    });
    expect(output.query).toBe('headphones');
    expect(output.count).toBe(1);
    expect(output.items[0].id).toBe('p1');
    expect(output.items[0].scores.rrf).toBe(0.2);
  });
});
