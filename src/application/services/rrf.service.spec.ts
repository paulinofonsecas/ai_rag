// Covers: product in both lists, semantic-only, lexical-only, empty inputs,
//         custom k, sort order, scores/ranks propagation
import { Product } from 'src/domain/entities/product.entity';

import { RrfService } from './rrf.service';

describe('RrfService', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const p1 = new Product('p1', 'Headphones', 'Noise cancelling', 'audio', now, now);
    const p2 = new Product('p2', 'Mouse', 'Gaming', 'peripherals', now, now);
    const p3 = new Product('p3', 'Keyboard', 'Mechanical', 'peripherals', now, now);

    let service: RrfService;

    beforeEach(() => {
        service = new RrfService();
    });

    it('returns empty array when both result lists are empty', () => {
        const result = service.fuse([], []);
        expect(result).toEqual([]);
    });

    it('assigns only semanticRank when product appears in semantic results only', () => {
        const result = service.fuse(
            [{ product: p1, rank: 1, score: 0.9 }],
            [],
        );

        expect(result).toHaveLength(1);
        expect(result[0].product.id).toBe('p1');
        expect(result[0].semanticRank).toBe(1);
        expect(result[0].semanticScore).toBe(0.9);
        expect(result[0].lexicalRank).toBeUndefined();
        expect(result[0].lexicalScore).toBeUndefined();
        expect(result[0].rrfScore).toBeCloseTo(1 / (60 + 1));
    });

    it('assigns only lexicalRank when product appears in lexical results only', () => {
        const result = service.fuse(
            [],
            [{ product: p2, rank: 2, score: 0.7 }],
        );

        expect(result).toHaveLength(1);
        expect(result[0].product.id).toBe('p2');
        expect(result[0].lexicalRank).toBe(2);
        expect(result[0].lexicalScore).toBe(0.7);
        expect(result[0].semanticRank).toBeUndefined();
        expect(result[0].rrfScore).toBeCloseTo(1 / (60 + 2));
    });

    it('combines both contributions when product appears in both result lists', () => {
        const result = service.fuse(
            [{ product: p1, rank: 1, score: 0.9 }],
            [{ product: p1, rank: 1, score: 0.8 }],
        );

        expect(result).toHaveLength(1);
        expect(result[0].semanticRank).toBe(1);
        expect(result[0].lexicalRank).toBe(1);
        // Both at rank 1 with k=60: 1/61 + 1/61
        expect(result[0].rrfScore).toBeCloseTo(2 / 61);
    });

    it('sorts results by rrfScore descending', () => {
        // p1 in both lists (higher combined score), p2 in semantic only
        const result = service.fuse(
            [
                { product: p1, rank: 1, score: 0.9 },
                { product: p2, rank: 2, score: 0.8 },
            ],
            [{ product: p1, rank: 1, score: 0.95 }],
        );

        expect(result[0].product.id).toBe('p1');
        expect(result[1].product.id).toBe('p2');
        expect(result[0].rrfScore).toBeGreaterThan(result[1].rrfScore!);
    });

    it('respects custom k value', () => {
        const k = 10;
        const result = service.fuse(
            [{ product: p1, rank: 1, score: 1.0 }],
            [],
            k,
        );

        expect(result[0].rrfScore).toBeCloseTo(1 / (k + 1));
    });

    it('handles multiple products across both lists correctly', () => {
        const result = service.fuse(
            [
                { product: p1, rank: 1, score: 0.9 },
                { product: p2, rank: 2, score: 0.8 },
            ],
            [
                { product: p2, rank: 1, score: 0.95 },
                { product: p3, rank: 2, score: 0.6 },
            ],
        );

        expect(result).toHaveLength(3);
        const ids = result.map((r) => r.product.id);
        expect(ids).toContain('p1');
        expect(ids).toContain('p2');
        expect(ids).toContain('p3');

        // p2 has contributions from both lists — should outrank p1 (semantic only) and p3 (lexical only)
        expect(result[0].product.id).toBe('p2');
    });

    it('uses default k=60 when not provided', () => {
        const withDefault = service.fuse(
            [{ product: p1, rank: 5, score: 0.5 }],
            [],
        );
        const withExplicit = service.fuse(
            [{ product: p1, rank: 5, score: 0.5 }],
            [],
            60,
        );

        expect(withDefault[0].rrfScore).toBeCloseTo(withExplicit[0].rrfScore!);
    });
});

