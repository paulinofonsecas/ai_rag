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

## Useful Commands

- Tests: `npm test`
- Coverage: `npm run test:coverage`
- CLI ingest: `npm run playground -- ingest --name "..." --description "..." --category "..."`
- CLI search: `npm run playground -- search --query "..." --limit 5 --offset 0 --rrfk 60 --rerank true --rerank-candidates 40`
- Product seed: `npm run seed:products -- --count 500 --pause-every 25 --pause-ms 1500 --prefix "Catalog"`
- Product files seed: `npm run seed:products:files -- --count 500 --pause-every 25 --pause-ms 1500`
