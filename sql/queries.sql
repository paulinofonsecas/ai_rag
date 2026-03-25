-- Vector search (cosine distance, lower is better)
SELECT
  p.id,
  p.name,
  p.description,
  p.category,
  1 - (p.embedding <=> $1::vector) AS semantic_score
FROM products p
WHERE p.embedding IS NOT NULL
ORDER BY p.embedding <=> $1::vector ASC
LIMIT $2 OFFSET $3;

-- Full-text lexical search
SELECT
  p.id,
  p.name,
  p.description,
  p.category,
  ts_rank(p.search_vector, plainto_tsquery('simple', $1)) AS lexical_score
FROM products p
WHERE p.search_vector @@ plainto_tsquery('simple', $1)
ORDER BY lexical_score DESC, p.created_at DESC
LIMIT $2 OFFSET $3;

-- Hybrid input strategy: run top-k independently before RRF merge in application layer
-- semantic top-k: LIMIT $2
-- lexical top-k: LIMIT $2
