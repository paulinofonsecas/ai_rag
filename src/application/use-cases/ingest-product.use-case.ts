import { ProductIngestionJobPublisher } from 'src/domain/interfaces/job-publisher.interface';
import {
    CreateProductInput,
    SearchRepository,
} from 'src/domain/interfaces/search-repository.interface';

export class IngestProductUseCase {
    constructor(
        private readonly repository: SearchRepository,
        private readonly ingestionPublisher: ProductIngestionJobPublisher,
    ) { }

    async execute(input: CreateProductInput) {
        const product = await this.repository.createProduct(input);
        await this.ingestionPublisher.publishProductCreated({
            productId: product.id,
            name: product.name,
            description: product.description,
            category: product.category,
        });

        return product;
    }
}
