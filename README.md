# Hybrid Search Backend (NestJS + PostgreSQL + pgvector + BullMQ)

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- Redis 7+

## Setup

1. Install dependencies:
   npm install
2. Copy environment:
   cp .env.example .env
3. Run SQL migration:
   psql -h localhost -U postgres -d hybrid_search -f sql/001_init_hybrid_search.sql
4. Start API:
   npm run start:dev
5. Start worker:
   npm run start:worker

## Endpoints

- `POST /products`
- `GET /search?q=wireless+headphones&limit=10&offset=0&rrfK=60`

## Notes

- Product creation is synchronous for base row insert and async for embedding generation.
- Search falls back to lexical-only when embedding generation fails.
- Top-k is constrained per retrieval method before RRF merge for performance.
