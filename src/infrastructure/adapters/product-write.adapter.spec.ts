import { PostgresService } from 'src/infrastructure/database/postgres.service';

import { ProductWriteAdapter } from './product-write.adapter';

describe('ProductWriteAdapter', () => {
    it('updates embeddings without assigning generated search_vector', async () => {
        const postgres = {
            query: jest.fn().mockResolvedValue({ rows: [] }),
        } as unknown as jest.Mocked<PostgresService>;

        const adapter = new ProductWriteAdapter(postgres);

        await adapter.updateProductEmbedding('product-123', [0.1, 0.2, 0.3]);

        expect(postgres.query).toHaveBeenCalledTimes(1);

        const [sql, params] = postgres.query.mock.calls[0];

        expect(sql).toContain('SET embedding = $2::vector');
        expect(sql).toContain('updated_at = now()');
        expect(sql).not.toContain('search_vector =');
        expect(params).toEqual(['product-123', '[0.1,0.2,0.3]']);
    });
});