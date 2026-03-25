# Workers e Pipeline de Fila

## Fila
- Nome: `product-ingestion`
- Tipo de job: `ProductCreatedEvent`

## Fluxo de Ingestão Assíncrona
```mermaid
sequenceDiagram
  participant API as ProductController
  participant UC as IngestProductUseCase
  participant PUB as ProductIngestionPublisher
  participant Q as BullMQ
  participant W as ProductIngestionProcessor
  participant EMB as EmbeddingService
  participant DB as PostgreSQL

  API->>UC: create product
  UC->>DB: insert product
  UC->>PUB: publish ProductCreatedEvent
  PUB->>Q: enqueue job
  Q->>W: deliver job
  W->>EMB: generateProductEmbedding
  W->>DB: update embedding + search_vector
```

## Confiabilidade
- retries com backoff exponencial
- idempotência via `jobId` determinístico
- falhas registradas para replay
