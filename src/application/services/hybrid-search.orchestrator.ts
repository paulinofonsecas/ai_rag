import { EmbeddingService } from 'src/domain/interfaces/embedding-service.interface';
import {
  HybridSearchResult,
  SearchRepository,
} from 'src/domain/interfaces/search-repository.interface';

import { RrfService } from './rrf.service';

export type SearchOrchestratorInput = {
  query: string;
  limit: number;
  offset: number;
  rrfK: number;
  perMethodLimit: number;
};

export class HybridSearchOrchestrator {
  constructor(
    private readonly repository: SearchRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly rrfService: RrfService,
  ) {}

  async search(input: SearchOrchestratorInput): Promise<HybridSearchResult[]> {
    const lexicalResults = await this.repository.lexicalSearch(
      input.query,
      input.perMethodLimit,
      input.offset,
    );

    try {
      const embedding = await this.embeddingService.generateQueryEmbedding(input.query);
      const semanticResults = await this.repository.vectorSearch(
        embedding,
        input.perMethodLimit,
        input.offset,
      );

      return this.rrfService
        .fuse(semanticResults, lexicalResults, input.rrfK)
        .slice(0, input.limit);
    } catch {
      return lexicalResults.slice(0, input.limit).map<HybridSearchResult>((item) => ({
        product: item.product,
        semanticRank: undefined,
        lexicalRank: item.rank,
        semanticScore: undefined,
        lexicalScore: item.score,
        rrfScore: 1 / (input.rrfK + item.rank),
      }));
    }
  }
}
