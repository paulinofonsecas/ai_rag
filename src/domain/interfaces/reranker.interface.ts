import { HybridSearchResult } from 'src/domain/interfaces/search-repository.interface';

export interface ResultReranker {
    rerank(query: string, candidates: HybridSearchResult[]): Promise<string[]>;
}
