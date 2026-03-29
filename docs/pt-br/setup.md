# Ambiente e Setup

## Pré-requisitos

- Node.js 20+
- PostgreSQL 15+ com pgvector
- Redis 7+
- Docker Desktop (opcional, recomendado para setup rápido)

## Setup Local (sem Docker)

1. Instale dependências:
   - `npm install`
2. Crie o arquivo `.env` manualmente na raiz do projeto.
3. Inicialize o banco (primeira vez):
   - `psql -h localhost -U postgres -d hybrid_search -f sql/001_init_hybrid_search.sql`
4. Suba API:
   - `npm run start:dev`
5. Suba worker (com hot reload em dev):
   - `npm run start:worker:dev`
6. (Opcional) Suba o frontend local:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Setup rápido com Docker

- `docker compose up --build`

Frontend:

- Console (dev): `http://localhost:3001`
- Documentação técnica: `http://localhost:3001/docs`

## `.env` mínimo (exemplo)

Use como ponto de partida no ambiente local:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=hybrid_search
DB_USER=postgres
DB_PASSWORD=postgres

REDIS_HOST=localhost
REDIS_PORT=6379

EMBEDDING_API_KEY=local-dev-key
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSIONS=1536

RERANK_MODEL=gemini-2.5-flash
RERANK_MAX_CANDIDATES=40
```

## Variáveis Principais

- `PORT`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_POOL_MAX`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`
- `EMBEDDING_MAX_RETRIES`, `EMBEDDING_BACKOFF_MS`, `EMBEDDING_COOLDOWN_MS`
- `RERANK_MODEL`, `RERANK_MAX_CANDIDATES`
- `RERANK_MAX_RETRIES`, `RERANK_BACKOFF_MS`, `RERANK_COOLDOWN_MS`, `RERANK_CACHE_TTL_MS`

## Verificação rápida

- API: `GET http://localhost:3000/health` (ou endpoint de saúde equivalente do projeto)
- Frontend: abrir `http://localhost:3001`
- Worker: verificar logs sem erro de conexão com Redis/PostgreSQL

## Comandos úteis

- Rodar seed principal: `npm run seed:products`
- Rodar testes: `npm run test`
- Rodar playground CLI: `npm run playground -- --help`

## Notas

- API e worker devem rodar em paralelo para ingestão assíncrona de embeddings.
- Se usar Docker para frontend, ao adicionar novas dependências prefira recriar o serviço com build em vez de somente reiniciar.
- Em Docker, para refrescar dependências do frontend: `docker compose rm -s -v -f frontend && docker compose up -d --build frontend`
