# Busca Híbrida e RRF

## Estratégia de Recuperação
O sistema executa dois métodos por consulta:
1. Recuperação semântica com pgvector (`embedding <=> query_vector`)
2. Recuperação lexical com PostgreSQL FTS (`search_vector @@ plainto_tsquery`)

Os top-k de cada método são fusionados por Reciprocal Rank Fusion (RRF).

## Fórmula do RRF
Para cada item na posição `r`:

`score = 1 / (k + r)`

A pontuação final é a soma das contribuições das listas semântica e lexical.

## Fluxo da Busca
```mermaid
sequenceDiagram
  participant U as Usuario
  participant API as SearchController
  participant UC as SearchProductsUseCase
  participant OR as HybridSearchOrchestrator
  participant ES as EmbeddingService
  participant DB as Postgres (pgvector + FTS)

  U->>API: GET /search?q=...
  API->>UC: execute(query, limit, offset, rrfK)
  UC->>OR: search(...)
  OR->>DB: lexicalSearch
  OR->>ES: generateQueryEmbedding
  ES-->>OR: embedding
  OR->>DB: vectorSearch
  OR->>OR: fuse with RRF
  OR-->>UC: ranked results
  UC-->>API: ranked results
  API-->>U: normalized response
```

## Fallback
Se a geração de embedding da query falhar:
- retorna somente resultados lexicais
- mantém o mesmo formato de resposta
- `semanticScore` fica ausente
