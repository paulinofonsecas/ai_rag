# Environment and Setup

## Prerequisites
- Node.js 20+
- PostgreSQL 15+ with pgvector
- Redis 7+

## Local Setup
1. Install dependencies:
   - `npm install`
2. Create env file:
   - PowerShell: `Copy-Item .env.example .env`
3. Initialize database:
   - `psql -h localhost -U postgres -d hybrid_search -f sql/001_init_hybrid_search.sql`
4. Start API:
   - `npm run start:dev`
5. Start worker:
   - `npm run start:worker`

## Core Environment Variables
- `PORT`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_POOL_MAX`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_BASE_URL`

## Notes
- Worker must run in parallel to API for async embedding ingestion.
- For local testing without external embedding provider, keep a valid key or mock the adapter in tests.
