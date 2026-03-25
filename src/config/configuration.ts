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
    embedding: {
        apiKey: process.env.EMBEDDING_API_KEY,
        model: process.env.EMBEDDING_MODEL ?? 'gemini-embedding-001',
        dimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 1536),
    },
});
