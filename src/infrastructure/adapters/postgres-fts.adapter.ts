import { Injectable } from '@nestjs/common';

import { LexicalSearchPort } from 'src/domain/interfaces/search-repository.interface';
import { PostgresService } from 'src/infrastructure/database/postgres.service';

import { toProductEntity } from './row-mapper';

type FtsSearchRow = {
    id: string;
    name: string;
    description: string;
    category: string;
    image_url: string | null;
    embedding: number[] | null;
    created_at: Date;
    updated_at: Date;
    lexical_score: number;
    rank: number;
};

@Injectable()
export class PostgresFTSAdapter implements LexicalSearchPort {
    constructor(private readonly postgres: PostgresService) { }

    async lexicalSearch(query: string, limit: number, offset: number) {
        const { rows } = await this.postgres.query<FtsSearchRow>(
            `
      WITH ranked AS (
        SELECT
          p.id,
          p.name,
          p.description,
          p.category,
          p.image_url,
          p.embedding,
          p.created_at,
          p.updated_at,
          ts_rank(p.search_vector, plainto_tsquery('simple', $1)) AS lexical_score
        FROM products p
        WHERE p.search_vector @@ plainto_tsquery('simple', $1)
      )
      SELECT
        ranked.*,
        ROW_NUMBER() OVER (ORDER BY ranked.lexical_score DESC, ranked.created_at DESC) AS rank
      FROM ranked
      ORDER BY ranked.lexical_score DESC, ranked.created_at DESC
      LIMIT $2 OFFSET $3
      `,
            [query, limit, offset],
        );

        return rows.map((row: FtsSearchRow) => ({
            product: toProductEntity(row),
            rank: Number(row.rank),
            score: Number(row.lexical_score),
        }));
    }
}
