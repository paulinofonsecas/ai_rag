# Deploy com Docker

## Serviços
Definidos em `docker-compose.yml`:
- `postgres`: PostgreSQL com pgvector (`pgvector/pgvector:pg16`)
- `redis`: Redis 7
- `api`: aplicação HTTP NestJS
- `worker`: consumidor BullMQ

## Subir stack
- `docker compose up --build`

## Parar stack
- `docker compose down`

## Recriar banco do zero
- `docker compose down -v`
- `docker compose up --build`

## Portas
- API: `3000`
- PostgreSQL: `5432`
- Redis: `6379`
