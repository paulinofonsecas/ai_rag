import { IngestProductUseCase } from 'src/application/use-cases/ingest-product.use-case';
import { Product } from 'src/domain/entities/product.entity';
import { CreateProductDto } from 'src/presentation/dto/create-product.dto';

import { ProductController } from './product.controller';

describe('ProductController', () => {
    it('creates product and returns queued status', async () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const product = new Product('p1', 'Mouse', 'Gaming mouse', 'peripherals', now, now);

        const useCase: jest.Mocked<IngestProductUseCase> = {
            execute: jest.fn().mockResolvedValue(product),
        } as unknown as jest.Mocked<IngestProductUseCase>;

        const controller = new ProductController(useCase);

        const body: CreateProductDto = {
            name: 'Mouse',
            description: 'Gaming mouse',
            category: 'peripherals',
        };

        const output = await controller.create(body, 'cid-456');

        expect(useCase.execute).toHaveBeenCalledWith({
            name: 'Mouse',
            description: 'Gaming mouse',
            category: 'peripherals',
        });
        expect(output.id).toBe('p1');
        expect(output.status).toBe('queued_for_embedding');
    });
});
