import { PcaPoint } from './types';

export const COLOR_PALETTE = ['#0f766e', '#b45309', '#1d4ed8', '#b91c1c', '#7c3aed', '#0e7490', '#15803d', '#be185d'];

function normalize(values: number[]): number[] {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const value of values) {
        if (value < min) {
            min = value;
        }
        if (value > max) {
            max = value;
        }
    }

    const range = max - min;
    if (!Number.isFinite(range) || range === 0) {
        return values.map(() => 0.5);
    }

    return values.map((value) => (value - min) / range);
}

function dot(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) {
        sum += a[i] * b[i];
    }
    return sum;
}

function norm(vector: number[]): number {
    return Math.sqrt(dot(vector, vector));
}

function multiplyCovariance(centered: number[][], vector: number[]): number[] {
    const dimension = vector.length;
    const output = new Array<number>(dimension).fill(0);

    for (const row of centered) {
        const projection = dot(row, vector);
        for (let j = 0; j < dimension; j += 1) {
            output[j] += row[j] * projection;
        }
    }

    return output;
}

function powerIteration(centered: number[][], initial: number[], orthogonalTo?: number[]): number[] {
    let vector = initial;

    for (let iteration = 0; iteration < 30; iteration += 1) {
        let next = multiplyCovariance(centered, vector);

        if (orthogonalTo) {
            const projection = dot(next, orthogonalTo);
            next = next.map((value, index) => value - projection * orthogonalTo[index]);
        }

        const nextNorm = norm(next);
        if (!Number.isFinite(nextNorm) || nextNorm === 0) {
            break;
        }

        vector = next.map((value) => value / nextNorm);
    }

    return vector;
}

export function pca2D(vectors: number[][]): PcaPoint[] {
    if (vectors.length === 0) {
        return [];
    }

    const dimension = vectors[0].length;
    if (dimension < 2) {
        return vectors.map(() => ({ x: 0.5, y: 0.5 }));
    }

    const mean = new Array<number>(dimension).fill(0);
    for (const vector of vectors) {
        for (let j = 0; j < dimension; j += 1) {
            mean[j] += vector[j];
        }
    }

    for (let j = 0; j < dimension; j += 1) {
        mean[j] /= vectors.length;
    }

    const centered = vectors.map((vector) => vector.map((value, index) => value - mean[index]));

    const seed1 = new Array<number>(dimension).fill(0).map((_, i) => (i % 2 === 0 ? 1 : 0.5));
    const component1 = powerIteration(centered, seed1);

    const seed2 = new Array<number>(dimension).fill(0).map((_, i) => (i % 3 === 0 ? 0.8 : 0.2));
    const component2 = powerIteration(centered, seed2, component1);

    const xRaw = centered.map((row) => dot(row, component1));
    const yRaw = centered.map((row) => dot(row, component2));

    const x = normalize(xRaw);
    const y = normalize(yRaw);

    return x.map((xValue, index) => ({ x: xValue, y: y[index] }));
}

export function buildCategoryColorMap(categories: string[]): Map<string, string> {
    const mapping = new Map<string, string>();
    categories.forEach((category, index) => {
        mapping.set(category, COLOR_PALETTE[index % COLOR_PALETTE.length]);
    });
    return mapping;
}
