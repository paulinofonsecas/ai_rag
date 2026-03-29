# Docker Deployment

## Services

Defined in `docker-compose.yml`:

- `postgres`: pgvector-enabled PostgreSQL (image `pgvector/pgvector:pg16`)
- `redis`: Redis 7
- `api`: NestJS HTTP app
- `worker`: BullMQ consumer
- `frontend`: Next.js app (dev profile)
- `frontend-production`: Next.js app (production profile)

Notes:

- frontend build uses repository root as context and `frontend/Dockerfile`
- docs are mounted into frontend as read-only (`./docs:/app/docs:ro`) for filesystem-backed documentation pages

## Start

- `docker compose up --build`

## Start (Production Frontend Profile)

- `docker compose --profile production up --build`

## Stop

- `docker compose down`

## Recreate DB from scratch

- `docker compose down -v`
- `docker compose up --build`

## Refresh Frontend Dependencies

Use when new frontend packages were added and the running container still reports module resolution errors.

- `docker compose rm -s -v -f frontend`
- `docker compose up -d --build frontend`

Why: the frontend uses an isolated container `node_modules` volume, so `restart` alone does not reinstall dependencies.

## Ports

- API: `3000`
- PostgreSQL: `5432`
- Redis: `6379`
- Frontend (dev): `3001` -> container `3000`
- Frontend (production profile): `3011` -> container `3000`

## Init Script

- Migration is mounted into `docker-entrypoint-initdb.d` and runs on first DB initialization.

## Production Notes

- Replace default DB credentials.
- Store secrets in secret manager, not plain env files.
- Add health endpoints + orchestrator readiness checks.
- Validate `BACKEND_INTERNAL_URL` and profile-specific ports before publishing.
