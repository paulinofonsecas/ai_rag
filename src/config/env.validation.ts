export function validateEnv(config: Record<string, unknown>) {
  const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'REDIS_HOST', 'REDIS_PORT', 'EMBEDDING_API_KEY'];

  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return config;
}
