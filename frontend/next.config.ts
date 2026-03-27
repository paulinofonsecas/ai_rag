import type { NextConfig } from 'next';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const rootDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
    reactStrictMode: true,
    outputFileTracingRoot: join(rootDir, '..'),
};

export default nextConfig;
