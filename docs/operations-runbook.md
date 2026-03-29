# Operations Runbook

## Health Checklist

- API process running
- worker process running
- PostgreSQL reachable
- Redis reachable
- queue depth stable

Suggested validation:

- `docker compose ps`
- `docker compose logs api --tail 200`
- `docker compose logs worker --tail 200`
- HTTP smoke test: `GET /search?q=mouse&limit=1`

NOTE: there is currently no dedicated HTTP health endpoint in the backend.

## Common Incidents

### 1. Search returns lexical-only frequently

Symptoms:

- lower semantic relevance in returned items
- variable latency around embedding/rerank steps

Actions:

1. Validate `EMBEDDING_API_KEY`.
2. Check provider availability/connectivity.
3. Check API logs for embedding errors.
4. Test with `rerank=false` to isolate reranker impact.

### 2. Products created but no embeddings

Symptoms:

- `POST /products` returns `queued_for_embedding` but status never reaches `completed`

Actions:

1. Confirm worker process/container is up.
2. Check Redis health.
3. Inspect BullMQ retries/failed jobs.
4. Check `GET /products/:productId/stream` for `failed` events.

### 3. Slow search latency

Symptoms:

- elevated p95/p99 on `GET /search` or `GET /search/stream`

Actions:

1. Confirm HNSW and GIN indexes exist.
2. Reduce `limit` and/or `rerankCandidates`.
3. Temporarily disable rerank (`rerank=false`) as mitigation.
4. Inspect PostgreSQL query plans.

## Fast Mitigation Procedure

1. Reduce expensive search load:

- use `rerank=false` on critical paths
- reduce `rerankCandidates`

2. Confirm worker and Redis stability.
3. Monitor logs and latency for 10-15 minutes before further rollback actions.

## Safe Application Rollback

1. Roll back API config/version.
2. Keep worker running to drain pending queue jobs.
3. Validate minimum flow:

- create product
- follow ingestion status stream
- execute a simple search

## Backpressure and Scaling

- Scale workers horizontally for ingestion spikes.
- Keep API stateless and scale replicas behind load balancer.
- Cache frequent search queries at API edge or app cache layer.

## Safe Rollout

1. Deploy DB migration.
2. Deploy API and worker.
3. Validate with smoke tests:
   - create product
   - check queue ingestion
   - run semantic query
4. Monitor logs and latency before full traffic cutover.
