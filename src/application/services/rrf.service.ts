import { HybridSearchResult, RankedSearchResult } from 'src/domain/interfaces/search-repository.interface';

export class RrfService {
  fuse(
    semanticResults: RankedSearchResult[],
    lexicalResults: RankedSearchResult[],
    k = 60,
  ): HybridSearchResult[] {
    const merged = new Map<
      string,
      {
        product: RankedSearchResult['product'];
        semanticRank?: number;
        lexicalRank?: number;
        semanticScore?: number;
        lexicalScore?: number;
        rrfScore: number;
      }
    >();

    for (const result of semanticResults) {
      const existing = merged.get(result.product.id);
      const semanticContribution = 1 / (k + result.rank);
      if (existing) {
        existing.semanticRank = result.rank;
        existing.semanticScore = result.score;
        existing.rrfScore += semanticContribution;
        continue;
      }

      merged.set(result.product.id, {
        product: result.product,
        semanticRank: result.rank,
        semanticScore: result.score,
        rrfScore: semanticContribution,
      });
    }

    for (const result of lexicalResults) {
      const existing = merged.get(result.product.id);
      const lexicalContribution = 1 / (k + result.rank);
      if (existing) {
        existing.lexicalRank = result.rank;
        existing.lexicalScore = result.score;
        existing.rrfScore += lexicalContribution;
        continue;
      }

      merged.set(result.product.id, {
        product: result.product,
        lexicalRank: result.rank,
        lexicalScore: result.score,
        rrfScore: lexicalContribution,
      });
    }

    return Array.from(merged.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .map((item) => ({
        product: item.product,
        semanticRank: item.semanticRank,
        lexicalRank: item.lexicalRank,
        semanticScore: item.semanticScore,
        lexicalScore: item.lexicalScore,
        rrfScore: item.rrfScore,
      }));
  }
}
