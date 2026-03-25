# Docker Deployment

## Services
Defined in `docker-compose.yml`:
- `postgres`: pgvector-enabled PostgreSQL (image `pgvector/pgvector:pg16`)
- `redis`: Redis 7
- `api`: NestJS HTTP app
- `worker`: BullMQ consumer

## Start
- `docker compose up --build`

## Stop
- `docker compose down`

## Recreate DB from scratch
- `docker compose down -v`
- `docker compose up --build`

## Ports
- API: `3000`
- PostgreSQL: `5432`
- Redis: `6379`

## Init Script
- Migration is mounted into `docker-entrypoint-initdb.d` and runs on first DB initialization.

## Production Notes
- Replace default DB credentials.
- Store secrets in secret manager, not plain env files.
- Add health endpoints + orchestrator readiness checks.
