import { Product } from './product.entity';

describe('Product', () => {
    it('should create a product with required fields', () => {
        const now = new Date();
        const product = new Product('id', 'name', 'desc', 'cat', now, now);
        expect(product.id).toBe('id');
        expect(product.name).toBe('name');
        expect(product.description).toBe('desc');
        expect(product.category).toBe('cat');
        expect(product.createdAt).toBe(now);
        expect(product.updatedAt).toBe(now);
    });
});
