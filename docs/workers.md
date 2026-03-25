# Workers and Queue Pipeline

## Queue
- Name: `product-ingestion`
- Job type: `ProductCreatedEvent`

## Producer
`ProductIngestionPublisher` publishes job with:
- retries: 5 attempts
- exponential backoff
- deterministic `jobId` (`product-created:<productId>`) for idempotency

## Consumer
`ProductIngestionProcessor`:
1. receives product payload
2. builds embedding text as `name + category + description`
3. calls `EmbeddingService.generateProductEmbedding`
4. updates product embedding in PostgreSQL
5. refreshes FTS vector in update query

## Failure Handling
- Errors are logged with latency and product id.
- Job retries automatically by BullMQ.
- After retries exhausted, job is retained in failed set for inspection/replay.

## Horizontal Scaling
- Start multiple worker replicas.
- BullMQ ensures single-consumer processing per job.
- Keep queue + Redis centralized.
