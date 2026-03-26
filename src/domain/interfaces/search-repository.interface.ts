import { Product } from '../entities/product.entity';

export type RankedSearchResult = {
    product: Product;
    rank: number;
    score: number;
};

export type HybridSearchResult = {
    product: Product;
    rrfScore?: number;
    semanticRank?: number;
    lexicalRank?: number;
    semanticScore?: number;
    lexicalScore?: number;
};

export type CreateProductInput = {
    name: string;
    description: string;
    category: string;
};

export interface ProductWritePort {
    createProduct(input: CreateProductInput): Promise<Product>;
    updateProductEmbedding(productId: string, embedding: number[]): Promise<void>;
}

export interface VectorSearchPort {
    vectorSearch(queryEmbedding: number[], limit: number, offset: number): Promise<RankedSearchResult[]>;
}

export interface LexicalSearchPort {
    lexicalSearch(query: string, limit: number, offset: number): Promise<RankedSearchResult[]>;
}

export interface SearchRepository extends ProductWritePort, VectorSearchPort, LexicalSearchPort { }
