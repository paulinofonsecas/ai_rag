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

    /**
     * Busca lexical internacionalizada.
     * @param query Texto da busca
     * @param limit Limite de resultados
     * @param offset Offset
     * @param language Idioma do dicionário FTS (ex: 'portuguese', 'english', 'simple')
     * @param useUnaccent Se true, remove acentos antes de indexar/buscar
     */
    async lexicalSearch(
        query: string,
        limit: number,
        offset: number,
        language: string = 'portuguese',
        useUnaccent: boolean = true,
    ) {
        const vectorExpr = useUnaccent
            ? `to_tsvector('${language}', unaccent(coalesce(name, '') || ' ' || coalesce(category, '') || ' ' || coalesce(description, '')))`
            : `to_tsvector('${language}', coalesce(name, '') || ' ' || coalesce(category, '') || ' ' || coalesce(description, ''))`;
        const queryExpr = useUnaccent
            ? `plainto_tsquery('${language}', unaccent($1))`
            : `plainto_tsquery('${language}', $1)`;

        try {
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
              ts_rank(${vectorExpr}, ${queryExpr}) AS lexical_score
            FROM products p
            WHERE ${vectorExpr} @@ ${queryExpr}
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
        } catch (err) {
            // Propaga erro para o frontend/processo (não engole)
            // Pode customizar mensagem se quiser
            throw new Error(
                `Erro na busca lexical: ${(err as Error).message || err}`
            );
        }
    }
}
