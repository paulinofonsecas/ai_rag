# Hybrid Search Backend

Production-oriented backend for product ingestion and hybrid retrieval using:

- NestJS
- PostgreSQL + pgvector
- PostgreSQL FTS
- BullMQ workers

## Documentation Portal

See the complete system docs in:

- `docs/INDEX.md`
- `docs/pt-br/INDEX.md` (versao em PT-BR)

Quick links:

- Architecture: `docs/architecture.md`
- Setup: `docs/setup.md`
- Docker: `docs/docker.md`
- API: `docs/api.md`
- Hybrid Search and RRF: `docs/hybrid-search.md`
- Workers: `docs/workers.md`
- Testing: `docs/testing.md`
- CLI Playground: `docs/cli-playground.md`
- Operations Runbook: `docs/operations-runbook.md`

## Fast Start (Local)

1. `npm install`
2. PowerShell: `Copy-Item .env.example .env`
3. `psql -h localhost -U postgres -d hybrid_search -f sql/001_init_hybrid_search.sql`
4. API: `npm run start:dev`
5. Worker: `npm run start:worker`

## Fast Start (Docker)

1. Set `EMBEDDING_API_KEY` in your environment
2. `docker compose up --build`
3. Open frontend at `http://localhost:3001`

### Frontend Runtime Modes (Docker)

- Default startup is always development with watch/HMR:
  - `docker compose up --build frontend`
- Production profile is prepared and can be enabled when needed:
  - `docker compose --profile production up --build frontend-production`
  - Frontend production URL: `http://localhost:3011`

## Frontend (Next.js)

- Location: `frontend/`
- UI features:
  - Product ingestion (`POST /products`)
  - Hybrid search (`GET /search`)
- In Docker, the frontend talks to the API via server-side proxy routes:
  - `GET /api/search` -> backend `GET /search`
  - `POST /api/products` -> backend `POST /products`

This avoids browser CORS issues and keeps the API contract centralized.

## Useful Commands

- Tests: `npm test`
- Coverage: `npm run test:coverage`
- CLI ingest: `npm run playground -- ingest --name "..." --description "..." --category "..."`
- CLI search: `npm run playground -- search --query "..." --limit 5 --offset 0 --rrfk 60 --rerank true --rerank-candidates 40`
- Product seed: `npm run seed:products -- --count 500 --pause-every 25 --pause-ms 1500 --prefix "Catalog"`
- Product files seed: `npm run seed:products:files -- --count 500 --pause-every 25 --pause-ms 1500`
