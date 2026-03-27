import { Injectable } from '@nestjs/common';

import {
    CreateProductInput,
    ProductReadPort,
    ProductWritePort,
} from 'src/domain/interfaces/search-repository.interface';
import { PostgresService } from 'src/infrastructure/database/postgres.service';

import { toProductEntity } from './row-mapper';

type ProductRow = {
    id: string;
    name: string;
    description: string;
    category: string;
    embedding: number[] | null;
    created_at: Date;
    updated_at: Date;
};

@Injectable()
export class ProductWriteAdapter implements ProductWritePort, ProductReadPort {
    constructor(private readonly postgres: PostgresService) { }

    async createProduct(input: CreateProductInput) {
        const { rows } = await this.postgres.query<ProductRow>(
            `
      INSERT INTO products (name, description, category)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, category, embedding, created_at, updated_at
      `,
            [input.name, input.description, input.category],
        );

        return toProductEntity(rows[0]);
    }

    async updateProductEmbedding(productId: string, embedding: number[]) {
        const queryVector = `[${embedding.join(',')}]`;

        await this.postgres.query(
            `
      UPDATE products
      SET embedding = $2::vector,
          updated_at = now()
      WHERE id = $1
      `,
            [productId, queryVector],
        );
    }

    async getAllProducts() {
        const { rows } = await this.postgres.query<ProductRow>(
            `
      SELECT id, name, description, category, embedding, created_at, updated_at
      FROM products
      ORDER BY created_at DESC
      `,
        );

        return rows.map((row) => toProductEntity(row));
    }
}
