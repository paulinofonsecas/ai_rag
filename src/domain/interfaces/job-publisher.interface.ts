export type ProductCreatedEvent = {
    productId: string;
    name: string;
    description: string;
    category: string;
};

export interface ProductIngestionJobPublisher {
    publishProductCreated(event: ProductCreatedEvent): Promise<void>;
}
