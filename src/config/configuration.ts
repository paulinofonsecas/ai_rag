export default () => ({
    port: Number(process.env.PORT ?? 3000),
    database: {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        name: process.env.DB_NAME ?? 'hybrid_search',
        user: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        poolMax: Number(process.env.DB_POOL_MAX ?? 20),
    },
    queue: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
    },
    history: {
        redis: {
            key: process.env.SEARCH_HISTORY_REDIS_KEY ?? 'search:history:runs',
            ttlSeconds: Number(process.env.SEARCH_HISTORY_TTL_SECONDS ?? 60 * 60 * 24 * 7),
            maxEntries: Number(process.env.SEARCH_HISTORY_MAX_ENTRIES ?? 500),
        },
    },
    embedding: {
        apiKey: process.env.EMBEDDING_API_KEY,
        model: process.env.EMBEDDING_MODEL ?? 'gemini-embedding-001',
        dimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 1536),
        maxRetries: Number(process.env.EMBEDDING_MAX_RETRIES ?? 6),
        backoffMs: Number(process.env.EMBEDDING_BACKOFF_MS ?? 1000),
        cooldownMs: Number(process.env.EMBEDDING_COOLDOWN_MS ?? 15000),
    },
    reranker: {
        model: process.env.RERANK_MODEL ?? 'gemini-2.5-flash',
        maxCandidates: Number(process.env.RERANK_MAX_CANDIDATES ?? 40),
        maxRetries: Number(process.env.RERANK_MAX_RETRIES ?? 2),
        backoffMs: Number(process.env.RERANK_BACKOFF_MS ?? 400),
        cooldownMs: Number(process.env.RERANK_COOLDOWN_MS ?? 10000),
        cacheTtlMs: Number(process.env.RERANK_CACHE_TTL_MS ?? 30000),
    },
});
