export interface EmbeddingService {
    generateProductEmbedding(input: string): Promise<number[]>;
    generateQueryEmbedding(input: string): Promise<number[]>;
}
