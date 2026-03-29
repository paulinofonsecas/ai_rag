# Deploy com Docker

## Serviços

Definidos em `docker-compose.yml`:

- `postgres`: PostgreSQL com pgvector (`pgvector/pgvector:pg16`)
- `redis`: Redis 7
- `api`: aplicação HTTP NestJS
- `worker`: consumidor BullMQ
- `frontend`: aplicação Next.js (perfil de desenvolvimento)
- `frontend-production`: aplicação Next.js (perfil de produção)

Notas:

- o frontend usa contexto de build na raiz do repositório com `frontend/Dockerfile`
- a pasta de documentação é montada como read-only no frontend (`./docs:/app/docs:ro`) para páginas de docs baseadas em filesystem

## Subir stack

- `docker compose up --build`

## Subir stack com frontend de produção

- `docker compose --profile production up --build`

## Parar stack

- `docker compose down`

## Recriar banco do zero

- `docker compose down -v`
- `docker compose up --build`

## Atualizar dependências do frontend

Use quando novos pacotes forem adicionados no frontend e o container continuar exibindo erro de módulo não encontrado.

- `docker compose rm -s -v -f frontend`
- `docker compose up -d --build frontend`

Motivo: `restart` não reinstala dependências quando o serviço usa volume dedicado de `node_modules`.

## Portas

- API: `3000`
- PostgreSQL: `5432`
- Redis: `6379`
- Frontend (dev): `3001` -> container `3000`
- Frontend (perfil production): `3011` -> container `3000`

## Script de inicialização do banco

- a migração `sql/001_init_hybrid_search.sql` é montada em `docker-entrypoint-initdb.d` e executa na primeira inicialização do volume do PostgreSQL

## Observações de produção

- troque credenciais padrão de banco e redis
- use secret manager em vez de envs em texto plano
- mantenha readiness/health checks para API e workers
