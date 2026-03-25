# Architecture

## Goal
Provide a production-ready backend for product ingestion and hybrid search using semantic retrieval (pgvector) + lexical retrieval (PostgreSQL FTS), fused with RRF.

## Layers

### Domain
- `Product` entity
- Contracts:
  - `SearchRepository`
  - `EmbeddingService`
  - `ProductIngestionJobPublisher`

### Application
- `IngestProductUseCase`
- `SearchProductsUseCase`
- `HybridSearchOrchestrator`
- `RrfService`

### Infrastructure
- Database and queue adapters:
  - `PostgresService`
  - `ProductWriteAdapter`
  - `PgVectorAdapter`
  - `PostgresFTSAdapter`
  - `EmbeddingAPIAdapter`
  - `ProductIngestionPublisher`

### Presentation
- `ProductController`
- `SearchController`

### Workers
- `ProductIngestionProcessor`
- worker bootstrap in `main.worker.ts`

## Dependency Direction
- Domain has no infrastructure/framework dependency.
- Application depends on domain interfaces, not concrete adapters.
- Infrastructure implements domain contracts.
- Presentation and workers depend on application/infrastructure wiring only.

## Module Wiring
- Root API app:
  - `AppModule` -> `PresentationModule` -> `InfrastructureModule`
- Worker app:
  - `WorkersModule` -> `InfrastructureModule`
- CLI Playground app:
  - `PlaygroundModule` -> `InfrastructureModule`

## Data Flow
1. `POST /products`
2. Product is stored in PostgreSQL without blocking on embeddings.
3. Job `ProductCreatedEvent` is published to queue `product-ingestion`.
4. Worker consumes event, generates embedding, updates `embedding` + FTS vector.
5. `GET /search` executes lexical + semantic retrieval and fuses with RRF.
