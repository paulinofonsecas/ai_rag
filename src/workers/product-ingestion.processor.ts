import { Process, Processor } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { EmbeddingService } from 'src/domain/interfaces/embedding-service.interface';
import { ProductCreatedEvent } from 'src/domain/interfaces/job-publisher.interface';
import { SearchRepository } from 'src/domain/interfaces/search-repository.interface';
import {
  PRODUCT_CREATED_JOB,
  PRODUCT_INGESTION_QUEUE,
} from 'src/infrastructure/queue/product-ingestion.publisher';
import { TOKENS } from 'src/infrastructure/tokens';

@Processor(PRODUCT_INGESTION_QUEUE)
export class ProductIngestionProcessor {
  private readonly logger = new Logger(ProductIngestionProcessor.name);

  constructor(
    @Inject(TOKENS.SearchRepository)
    private readonly repository: SearchRepository,
    @Inject(TOKENS.EmbeddingService)
    private readonly embeddingService: EmbeddingService,
  ) {}

  @Process(PRODUCT_CREATED_JOB)
  async handle(job: Job<ProductCreatedEvent>) {
    const start = Date.now();
    const payload = job.data;
    const text = `${payload.name} ${payload.category} ${payload.description}`;

    try {
      const embedding = await this.embeddingService.generateProductEmbedding(text);
      await this.repository.updateProductEmbedding(payload.productId, embedding);

      this.logger.log({
        msg: 'worker.product_ingested',
        productId: payload.productId,
        latencyMs: Date.now() - start,
      });
    } catch (error) {
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
