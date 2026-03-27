import { Product } from 'src/domain/entities/product.entity';

type ProductRow = {
    id: string;
    name: string;
    description: string;
    category: string;
    image_url?: string | null;
    embedding: number[] | string | null;
    created_at: Date;
    updated_at: Date;
};

const parseEmbedding = (embedding: number[] | string | null): number[] | undefined => {
    if (!embedding) {
        return undefined;
    }

    if (Array.isArray(embedding)) {
        return embedding;
    }

    const trimmed = embedding.trim();
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
        return undefined;
    }

    const values = trimmed
        .slice(1, -1)
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value));

    return values.length > 0 ? values : undefined;
};

export const toProductEntity = (row: ProductRow): Product => {
    const imageUrl = typeof row.image_url === 'string' && row.image_url.trim().length > 0
        ? row.image_url.trim()
        : undefined;

    return new Product(
        row.id,
        row.name,
        row.description,
        row.category,
        new Date(row.created_at),
        new Date(row.updated_at),
        parseEmbedding(row.embedding),
        imageUrl,
    );
};
