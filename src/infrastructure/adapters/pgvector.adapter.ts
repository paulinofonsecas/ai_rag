import { Injectable } from '@nestjs/common';

import { VectorSearchPort } from 'src/domain/interfaces/search-repository.interface';
import { PostgresService } from 'src/infrastructure/database/postgres.service';

import { toProductEntity } from './row-mapper';

type VectorSearchRow = {
    id: string;
    name: string;
    description: string;
    category: string;
    embedding: number[] | null;
    created_at: Date;
    updated_at: Date;
    distance: number;
    rank: number;
};

@Injectable()
export class PgVectorAdapter implements VectorSearchPort {
    constructor(private readonly postgres: PostgresService) { }

    async vectorSearch(queryEmbedding: number[], limit: number, offset: number) {
        const queryVector = `[${queryEmbedding.join(',')}]`;

        const { rows } = await this.postgres.query<VectorSearchRow>(
            `
      SELECT
        p.id,
        p.name,
        p.description,
        p.category,
        p.embedding,
        p.created_at,
        p.updated_at,
        (p.embedding <=> $1::vector) AS distance,
        ROW_NUMBER() OVER (ORDER BY p.embedding <=> $1::vector ASC) AS rank
      FROM products p
      WHERE p.embedding IS NOT NULL
      ORDER BY p.embedding <=> $1::vector ASC
      LIMIT $2 OFFSET $3
      `,
            [queryVector, limit, offset],
        );

        return rows.map((row: VectorSearchRow) => ({
            product: toProductEntity(row),
            rank: Number(row.rank),
            score: 1 - Number(row.distance),
        }));
    }
}
