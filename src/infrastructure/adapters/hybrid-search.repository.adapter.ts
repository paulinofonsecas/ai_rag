import { Injectable } from '@nestjs/common';

import {
    CreateProductInput,
    LexicalSearchPort,
    ProductWritePort,
    SearchRepository,
    VectorSearchPort,
} from 'src/domain/interfaces/search-repository.interface';

@Injectable()
export class HybridSearchRepositoryAdapter implements SearchRepository {
    constructor(
        private readonly productWrite: ProductWritePort,
        private readonly vectorPort: VectorSearchPort,
        private readonly lexicalPort: LexicalSearchPort,
    ) { }

    createProduct(input: CreateProductInput) {
        return this.productWrite.createProduct(input);
    }

    updateProductEmbedding(productId: string, embedding: number[]) {
        return this.productWrite.updateProductEmbedding(productId, embedding);
    }

    vectorSearch(queryEmbedding: number[], limit: number, offset: number) {
        return this.vectorPort.vectorSearch(queryEmbedding, limit, offset);
    }

    lexicalSearch(query: string, limit: number, offset: number) {
        return this.lexicalPort.lexicalSearch(query, limit, offset);
    }
}
