import { PostgresService } from 'src/infrastructure/database/postgres.service';

import { PostgresFTSAdapter } from './postgres-fts.adapter';

const makeRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'prod-1',
    name: 'CAFE SOLUVEL DELTA',
    description: 'Cafe soluvel premium',
    category: 'alimentares',
    image_url: null,
    embedding: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    lexical_score: '0.075990885',
    rank: '1',
    ...overrides,
});

describe('PostgresFTSAdapter', () => {
    let postgres: jest.Mocked<PostgresService>;
    let adapter: PostgresFTSAdapter;

    beforeEach(() => {
        postgres = {
            query: jest.fn(),
        } as unknown as jest.Mocked<PostgresService>;

        adapter = new PostgresFTSAdapter(postgres);
    });

    describe('lexicalSearch', () => {
        it('executes FTS query with plainto_tsquery and correct params', async () => {
            postgres.query.mockResolvedValue({ rows: [] } as never);

            await adapter.lexicalSearch('cafe', 10, 0);

            expect(postgres.query).toHaveBeenCalledTimes(1);
            const [sql, params] = postgres.query.mock.calls[0];

            expect(sql).toContain("plainto_tsquery('simple', $1)");
            expect(sql).toContain('search_vector @@');
            expect(sql).toContain('ts_rank');
            expect(sql).toContain('LIMIT $2');
            expect(sql).toContain('OFFSET $3');
            expect(params).toEqual(['cafe', 10, 0]);
        });

        it('returns mapped results with correct score and rank', async () => {
            const row = makeRow({ lexical_score: '0.075990885', rank: '1' });
            postgres.query.mockResolvedValue({ rows: [row] } as never);

            const results = await adapter.lexicalSearch('cafe', 10, 0);

            expect(results).toHaveLength(1);
            expect(results[0].product.id).toBe('prod-1');
            expect(results[0].product.name).toBe('CAFE SOLUVEL DELTA');
            expect(results[0].score).toBeCloseTo(0.075990885);
            expect(results[0].rank).toBe(1);
        });

        it('returns empty array when no products match the query', async () => {
            postgres.query.mockResolvedValue({ rows: [] } as never);

            const results = await adapter.lexicalSearch('xyznonexistent', 10, 0);

            expect(results).toHaveLength(0);
        });

        it('maps multiple rows preserving rank order', async () => {
            const rows = [
                makeRow({ id: 'p1', name: 'CAFE EXPRESSO', lexical_score: '0.09', rank: '1' }),
                makeRow({ id: 'p2', name: 'CAFE MOIDO', lexical_score: '0.07', rank: '2' }),
                makeRow({ id: 'p3', name: 'CAFE INSTANTANEO', lexical_score: '0.05', rank: '3' }),
            ];
            postgres.query.mockResolvedValue({ rows } as never);

            const results = await adapter.lexicalSearch('cafe', 25, 0);

            expect(results).toHaveLength(3);
            expect(results[0].rank).toBe(1);
            expect(results[1].rank).toBe(2);
            expect(results[2].rank).toBe(3);
            expect(results[0].score).toBeGreaterThan(results[2].score);
        });

        it('forwards limit and offset params correctly', async () => {
            postgres.query.mockResolvedValue({ rows: [] } as never);

            await adapter.lexicalSearch('batata', 50, 25);

            const [, params] = postgres.query.mock.calls[0];
            expect(params).toEqual(['batata', 50, 25]);
        });

        it('handles product with image_url', async () => {
            const row = makeRow({ image_url: 'https://example.com/img.jpg' });
            postgres.query.mockResolvedValue({ rows: [row] } as never);

            const results = await adapter.lexicalSearch('cafe', 10, 0);

            expect(results[0].product.imageUrl).toBe('https://example.com/img.jpg');
        });

        it('uses WITH ranked CTE structure for deterministic ordering', async () => {
            postgres.query.mockResolvedValue({ rows: [] } as never);

            await adapter.lexicalSearch('cafe', 10, 0);

            const [sql] = postgres.query.mock.calls[0];
            expect(sql).toContain('WITH ranked AS');
            expect(sql).toContain('ROW_NUMBER() OVER');
        });
    });
});
