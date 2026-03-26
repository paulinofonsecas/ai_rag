# API HTTP

## POST /products

Cria produto e dispara job assíncrono de embedding.

### Body

```json
{
  "name": "MX Master 3",
  "description": "Wireless ergonomic mouse",
  "category": "peripherals"
}
```

### Resposta

```json
{
  "id": "uuid",
  "name": "MX Master 3",
  "description": "Wireless ergonomic mouse",
  "category": "peripherals",
  "createdAt": "2026-03-25T10:00:00.000Z",
  "updatedAt": "2026-03-25T10:00:00.000Z",
  "status": "queued_for_embedding"
}
```

## GET /search

Busca híbrida.

### Query Params

- `q` obrigatório
- `limit` opcional (padrão 10)
- `offset` opcional (padrão 0)
- `rrfK` opcional (padrão 60)
- `rerank` opcional (padrão true): usa Gemini para reordenar os candidatos fundidos
- `rerankCandidates` opcional (padrão 40): quantidade de candidatos enviados ao reranker

### Exemplo

`GET /search?q=ergonomic+wireless+mouse&limit=10&offset=0&rrfK=60&rerank=true&rerankCandidates=40`
