import { Artifact } from './artifact.entity';

describe('Artifact', () => {
    it('should create an artifact with required fields', () => {
        const now = new Date();
        const artifact = new Artifact('id', 'type', { foo: 'bar' }, now);
        expect(artifact.id).toBe('id');
        expect(artifact.type).toBe('type');
        expect(artifact.data).toEqual({ foo: 'bar' });
        expect(artifact.createdAt).toBe(now);
    });
});
