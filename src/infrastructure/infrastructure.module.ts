import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RrfService } from 'src/application/services/rrf.service';
import { HybridSearchOrchestrator } from 'src/application/services/hybrid-search.orchestrator';
import { IngestProductUseCase } from 'src/application/use-cases/ingest-product.use-case';
import { SearchProductsUseCase } from 'src/application/use-cases/search-products.use-case';
import { PostgresFTSAdapter } from 'src/infrastructure/adapters/postgres-fts.adapter';
import { HybridSearchRepositoryAdapter } from 'src/infrastructure/adapters/hybrid-search.repository.adapter';
import { PgVectorAdapter } from 'src/infrastructure/adapters/pgvector.adapter';
import { ProductWriteAdapter } from 'src/infrastructure/adapters/product-write.adapter';
import { EmbeddingAPIAdapter } from 'src/infrastructure/adapters/embedding-api.adapter';
import { PostgresModule } from 'src/infrastructure/database/postgres.module';
import {
  PRODUCT_INGESTION_QUEUE,
  ProductIngestionPublisher,
} from 'src/infrastructure/queue/product-ingestion.publisher';
import { TOKENS } from 'src/infrastructure/tokens';

@Module({
  imports: [
    PostgresModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('queue.host'),
          port: configService.getOrThrow<number>('queue.port'),
          password: configService.get<string>('queue.password'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: PRODUCT_INGESTION_QUEUE,
    }),
  ],
  providers: [
    PgVectorAdapter,
    PostgresFTSAdapter,
    ProductWriteAdapter,
    ProductIngestionPublisher,
    EmbeddingAPIAdapter,
    RrfService,
    {
      provide: TOKENS.SearchRepository,
      inject: [ProductWriteAdapter, PgVectorAdapter, PostgresFTSAdapter],
      useFactory: (
        productWrite: ProductWriteAdapter,
        vectorSearch: PgVectorAdapter,
        lexicalSearch: PostgresFTSAdapter,
      ) => new HybridSearchRepositoryAdapter(productWrite, vectorSearch, lexicalSearch),
    },
    {
      provide: TOKENS.EmbeddingService,
      useExisting: EmbeddingAPIAdapter,
    },
    {
      provide: TOKENS.ProductIngestionPublisher,
      useExisting: ProductIngestionPublisher,
    },
    {
      provide: TOKENS.HybridSearchOrchestrator,
      inject: [TOKENS.SearchRepository, TOKENS.EmbeddingService, RrfService],
      useFactory: (repository: HybridSearchRepositoryAdapter, embeddingService: EmbeddingAPIAdapter, rrfService: RrfService) =>
        new HybridSearchOrchestrator(repository, embeddingService, rrfService),
    },
    {
      provide: TOKENS.SearchProductsUseCase,
      inject: [TOKENS.HybridSearchOrchestrator],
      useFactory: (orchestrator: HybridSearchOrchestrator) => new SearchProductsUseCase(orchestrator),
    },
    {
      provide: TOKENS.IngestProductUseCase,
      inject: [TOKENS.SearchRepository, TOKENS.ProductIngestionPublisher],
      useFactory: (
        repository: HybridSearchRepositoryAdapter,
        publisher: ProductIngestionPublisher,
      ) => new IngestProductUseCase(repository, publisher),
    },
  ],
  exports: [
    TOKENS.SearchRepository,
    TOKENS.EmbeddingService,
    TOKENS.SearchProductsUseCase,
    TOKENS.IngestProductUseCase,
    BullModule,
  ],
})
export class InfrastructureModule {}
