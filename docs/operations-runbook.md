# Operations Runbook

## Health Checklist
- API process running
- worker process running
- PostgreSQL reachable
- Redis reachable
- queue depth stable

## Common Incidents

### 1. Search returns lexical-only frequently
Possible causes:
- embedding provider outage
- invalid API key
- network timeout to provider

Actions:
1. Check API logs for embedding failures.
2. Validate `EMBEDDING_API_KEY`.
3. Test provider connectivity.

### 2. Products created but no embeddings
Possible causes:
- worker down
- Redis unavailable
- jobs failing and exhausting retries

Actions:
1. Confirm worker process/container is up.
2. Check Redis health.
3. Inspect BullMQ failed jobs and replay after fix.

### 3. Slow search latency
Possible causes:
- missing indexes
- oversized top-k
- database saturation

Actions:
1. Confirm HNSW and GIN indexes exist.
2. Reduce per-method candidate pool.
3. Inspect PostgreSQL query plans.

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
