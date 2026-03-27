import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { EmbeddingService } from 'src/domain/interfaces/embedding-service.interface';
import { ProductCreatedEvent } from 'src/domain/interfaces/job-publisher.interface';
import { SearchRepository } from 'src/domain/interfaces/search-repository.interface';
import { ProductIngestionStatusRedisStream } from 'src/infrastructure/cache/product-ingestion-status.redis-stream';
import {
    PRODUCT_INGESTION_QUEUE
} from 'src/infrastructure/queue/product-ingestion.publisher';
import { TOKENS } from 'src/infrastructure/tokens';

@Processor(PRODUCT_INGESTION_QUEUE)
export class ProductIngestionProcessor extends WorkerHost {
    private readonly logger = new Logger(ProductIngestionProcessor.name);

    constructor(
        @Inject(TOKENS.SearchRepository)
        private readonly repository: SearchRepository,
        @Inject(TOKENS.EmbeddingService)
        private readonly embeddingService: EmbeddingService,
        private readonly statusStream: ProductIngestionStatusRedisStream,
    ) {
        super();
    }

    async process(job: Job<ProductCreatedEvent>) {
        const start = Date.now();
        const payload = job.data;
        const text = `${payload.name} ${payload.category} ${payload.description}`;

        try {
            await this.statusStream.publishStatus({
                productId: payload.productId,
                status: 'processing',
                at: new Date().toISOString(),
                message: 'Gerando embedding do produto.',
            });

            const embedding = await this.embeddingService.generateProductEmbedding(text);

            await this.repository.updateProductEmbedding(payload.productId, embedding);

            await this.statusStream.publishStatus({
                productId: payload.productId,
                status: 'completed',
                at: new Date().toISOString(),
                message: 'Embedding gerado com sucesso.',
            });

            this.logger.log({
                msg: 'worker.product_ingested',
                jobId: job.id,
                productId: payload.productId,
                latencyMs: Date.now() - start,
            });
        } catch (error) {
            await this.statusStream.publishStatus({
                productId: payload.productId,
                status: 'failed',
                at: new Date().toISOString(),
                message: error instanceof Error ? error.message : 'Erro no processamento da ingestao.',
            });

            this.logger.error({
                msg: 'worker.product_ingest_failed',
                productId: payload.productId,
                latencyMs: Date.now() - start,
                error: error instanceof Error ? error.message : 'unknown_error',
            });
            throw error;
        }
    }
}
