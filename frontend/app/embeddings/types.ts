export type EmbeddingItem = {
    id: string;
    name: string;
    description: string;
    category: string;
    embedding: number[];
};

export type EmbeddingResponse = {
    count: number;
    items: EmbeddingItem[];
};

export type PcaPoint = {
    x: number;
    y: number;
};
