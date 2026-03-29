# API HTTP

## Observações Gerais

- Base URL local: `http://localhost:3000`
- Header opcional: `x-correlation-id` (se ausente, a API gera automaticamente)
- Validação global ativa com `transform`, `whitelist` e `forbidNonWhitelisted`

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

Regras de validação:

- `name`: string, 2-255 chars
- `description`: string, 2-5000 chars
- `category`: string, 2-120 chars

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

## GET /products/:productId/stream

Stream SSE de status da ingestão para um produto.

Eventos emitidos (`data`):

- `type`: `status`
- `status`: `queued | processing | completed | failed`
- `productId`, `at`, `message`

Exemplo:

- `GET /products/9f9d4b67-0d18-4d0f-bfef-5f13f2df7fd1/stream`

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

## GET /search/stream

Busca híbrida com progresso em tempo real via SSE.

Eventos emitidos:

- passos de execução (`embedding`, `vector_search`, `lexical_search`, `rrf_fusion`, `rerank`, etc.)
- `type: done` com `items` finais e `vectorItems`
- `type: error` em caso de falha

Exemplo:

- `GET /search/stream?q=ergonomic+wireless+mouse&limit=10&rrfK=60&rerank=true`

## GET /search/export-embeddings

Exporta embeddings em TSV (download de arquivo).

Resposta:

- `Content-Type: text/tab-separated-values`
- `Content-Disposition: attachment; filename="embeddings-<timestamp>.tsv"`

## GET /search/embeddings

Lista embeddings para visualização (mapa/projeção).

Query Params:

- `ids` opcional: lista separada por vírgula para filtrar produtos específicos

Exemplos:

- `GET /search/embeddings`
- `GET /search/embeddings?ids=id1,id2,id3`
