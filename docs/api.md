# HTTP API

## POST /products
Create product and enqueue async embedding job.

### Request Body
```json
{
  "name": "MX Master 3",
  "description": "Wireless ergonomic mouse",
  "category": "peripherals"
}
```

### Validation
- `name`: string, min 2, max 255
- `description`: string, min 2, max 5000
- `category`: string, min 2, max 120

### Response
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
Hybrid search endpoint.

### Query Params
- `q` (required): natural language query
- `limit` (optional, default 10)
- `offset` (optional, default 0)
- `rrfK` (optional, default 60)

### Example
`GET /search?q=ergonomic+wireless+mouse&limit=10&offset=0&rrfK=60`

### Response
```json
{
  "query": "ergonomic wireless mouse",
  "count": 2,
  "items": [
    {
      "id": "uuid",
      "name": "MX Master 3",
      "description": "Wireless ergonomic mouse",
      "category": "peripherals",
      "scores": {
        "rrf": 0.032,
        "semantic": 0.93,
        "lexical": 0.72
      },
      "ranks": {
        "semantic": 1,
        "lexical": 2
      }
    }
  ]
}
```

## Correlation ID
- Request header `x-correlation-id` is accepted.
- If missing, middleware generates one and echoes it in response headers.
