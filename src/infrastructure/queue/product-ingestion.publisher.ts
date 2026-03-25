import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import {
    ProductCreatedEvent,
    ProductIngestionJobPublisher,
} from 'src/domain/interfaces/job-publisher.interface';

export const PRODUCT_INGESTION_QUEUE = 'product-ingestion';
export const PRODUCT_CREATED_JOB = 'ProductCreatedEvent';

@Injectable()
export class ProductIngestionPublisher implements ProductIngestionJobPublisher {
    constructor(@InjectQueue(PRODUCT_INGESTION_QUEUE) private readonly queue: Queue) { }

    async publishProductCreated(event: ProductCreatedEvent) {
        const jobId = `product-created-${event.productId}`;

        await this.queue.add(PRODUCT_CREATED_JOB, event, {
            attempts: 5,
            removeOnComplete: true,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            jobId,
        });
    }
}
