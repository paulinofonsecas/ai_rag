# Hybrid Search and RRF

## Retrieval Strategy
The system runs two retrieval methods per query:
1. Semantic retrieval via pgvector (`embedding <=> query_vector`)
2. Lexical retrieval via PostgreSQL FTS (`search_vector @@ plainto_tsquery`)

Top-k candidates from each method are fused with Reciprocal Rank Fusion (RRF).

## RRF Formula
For each result at rank `r` in a list:

`score = 1 / (k + r)`

Final score is the sum of contributions from semantic and lexical lists.

## Why RRF
- Robust against score scale mismatch across retrieval methods.
- Stable behavior when one retriever underperforms.
- Easy to tune through `k` without heavy reweighting logic.

## SQL Patterns
Vector search (cosine distance):
- ordered ascending by `<=>`
- transformed similarity: `1 - distance`

FTS search:
- `search_vector @@ plainto_tsquery('simple', $1)`
- ranking with `ts_rank`

## Fallback Behavior
If query embedding generation fails:
- system returns lexical-only results
- still returns fused-like shape with `semanticScore` absent

## Performance Controls
- per-method top-k cap before fusion
- pagination with `limit` and `offset`
- HNSW index for vectors
- GIN index for FTS
