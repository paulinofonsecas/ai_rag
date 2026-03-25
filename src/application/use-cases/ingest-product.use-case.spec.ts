import { Product } from 'src/domain/entities/product.entity';
import { ProductIngestionJobPublisher } from 'src/domain/interfaces/job-publisher.interface';
import { SearchRepository } from 'src/domain/interfaces/search-repository.interface';

import { IngestProductUseCase } from './ingest-product.use-case';

describe('IngestProductUseCase', () => {
  it('creates product and publishes ProductCreatedEvent', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const product = new Product('p1', 'Mouse', 'Gaming mouse', 'peripherals', now, now);

    const repository: jest.Mocked<SearchRepository> = {
      createProduct: jest.fn().mockResolvedValue(product),
      updateProductEmbedding: jest.fn(),
      vectorSearch: jest.fn(),
      lexicalSearch: jest.fn(),
    };

    const publisher: jest.Mocked<ProductIngestionJobPublisher> = {
      publishProductCreated: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new IngestProductUseCase(repository, publisher);

    const result = await useCase.execute({
      name: 'Mouse',
      description: 'Gaming mouse',
      category: 'peripherals',
    });

    expect(repository.createProduct).toHaveBeenCalledTimes(1);
    expect(publisher.publishProductCreated).toHaveBeenCalledWith({
      productId: 'p1',
      name: 'Mouse',
      description: 'Gaming mouse',
      category: 'peripherals',
    });
    expect(result.id).toBe('p1');
  });
});
