import { Product } from 'src/domain/entities/product.entity';

import { RrfService } from './rrf.service';

describe('RrfService', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  const p1 = new Product('p1', 'Headphones', 'Noise cancelling', 'audio', now, now);
  const p2 = new Product('p2', 'Mouse', 'Gaming mouse', 'peripherals', now, now);
  const p3 = new Product('p3', 'Keyboard', 'Mechanical keyboard', 'peripherals', now, now);

  it('fuses two ranked lists and sorts by RRF score', () => {
    const service = new RrfService();

    const fused = service.fuse(
      [
        { product: p1, rank: 1, score: 0.98 },
        { product: p2, rank: 2, score: 0.88 },
      ],
      [
        { product: p2, rank: 1, score: 0.77 },
        { product: p3, rank: 2, score: 0.66 },
      ],
      60,
    );

    expect(fused).toHaveLength(3);
    expect(fused[0].product.id).toBe('p2');
    expect(fused[0].semanticRank).toBe(2);
    expect(fused[0].lexicalRank).toBe(1);
  });

  it('respects configurable k value', () => {
    const service = new RrfService();

    const highK = service.fuse([{ product: p1, rank: 1, score: 0.99 }], [], 100)[0].rrfScore;
    const lowK = service.fuse([{ product: p1, rank: 1, score: 0.99 }], [], 10)[0].rrfScore;

    expect(lowK).toBeGreaterThan(highK);
  });
});
