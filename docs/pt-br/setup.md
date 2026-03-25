# Ambiente e Setup

## Pré-requisitos
- Node.js 20+
- PostgreSQL 15+ com pgvector
- Redis 7+

## Setup Local
1. Instale dependências:
   - `npm install`
2. Crie arquivo de ambiente:
   - PowerShell: `Copy-Item .env.example .env`
3. Inicialize o banco:
   - `psql -h localhost -U postgres -d hybrid_search -f sql/001_init_hybrid_search.sql`
4. Suba API:
   - `npm run start:dev`
5. Suba worker:
   - `npm run start:worker`

## Variáveis Principais
- `PORT`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_POOL_MAX`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_BASE_URL`
