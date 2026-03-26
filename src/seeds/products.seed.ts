import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { IngestProductUseCase } from 'src/application/use-cases/ingest-product.use-case';
import { TOKENS } from 'src/infrastructure/tokens';
import { PlaygroundModule } from 'src/playground/playground.module';

type SeedArgs = {
    count: number;
    pauseEvery: number;
    pauseMs: number;
    retryAttempts: number;
    retryDelayMs: number;
    prefix: string;
};

type ProductSeedInput = {
    name: string;
    category: string;
    description: string;
};

const categories = [
    'audio',
    'peripherals',
    'gaming',
    'smart-home',
    'office',
    'video',
    'mobile',
    'network',
];

const adjectives = [
    'Smart',
    'Portable',
    'Ultra',
    'Compact',
    'Pro',
    'Wireless',
    'Advanced',
    'Premium',
    'Silent',
    'Ergonomic',
];

const nouns = [
    'Headset',
    'Keyboard',
    'Mouse',
    'Speaker',
    'Monitor',
    'Camera',
    'Router',
    'Microphone',
    'Dock',
    'Controller',
];

const audiences = [
    'for home office',
    'for creators',
    'for gamers',
    'for streaming setups',
    'for daily productivity',
    'for professional teams',
    'for hybrid work',
    'for compact desks',
];

const features = [
    'low latency connection',
    'clear sound profile',
    'precise control surface',
    'long battery life',
    'stable wireless link',
    'high durability finish',
    'fast USB-C connectivity',
    'optimized thermal profile',
];

function parseArgs(argv: string[]): SeedArgs {
    const args = new Map<string, string>();

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];
        if (!value.startsWith('--')) {
            continue;
        }

        const key = value.replace('--', '');
        const next = argv[index + 1];
        if (!next || next.startsWith('--')) {
            args.set(key, 'true');
            continue;
        }

        args.set(key, next);
        index += 1;
    }

    const count = clampNumber(args.get('count'), 100, 1, 500);
    return {
        count,
        pauseEvery: clampNumber(args.get('pause-every'), 25, 1, 500),
        pauseMs: clampNumber(args.get('pause-ms'), 1500, 0, 60000),
        retryAttempts: clampNumber(args.get('retry-attempts'), 3, 1, 20),
        retryDelayMs: clampNumber(args.get('retry-delay-ms'), 750, 0, 30000),
        prefix: (args.get('prefix') ?? 'Seed').trim() || 'Seed',
    };
}

function clampNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
    const parsed = Number(raw ?? fallback);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function buildProduct(index: number, prefix: string): ProductSeedInput {
    const category = categories[index % categories.length];
    const adjective = adjectives[index % adjectives.length];
    const noun = nouns[Math.floor(index / adjectives.length) % nouns.length];
    const audience = audiences[index % audiences.length];
    const feature = features[index % features.length];
    const serial = String(index + 1).padStart(3, '0');

    return {
        name: `${prefix} ${adjective} ${noun} ${serial}`,
        category,
        description: `${adjective} ${noun.toLowerCase()} in category ${category} ${audience}, with ${feature} and catalog batch ${serial}.`,
    };
}

async function sleep(ms: number): Promise<void> {
    if (ms <= 0) {
        return;
    }

    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function createWithRetry(
    useCase: IngestProductUseCase,
    logger: Logger,
    input: ProductSeedInput,
    retryAttempts: number,
    retryDelayMs: number,
) {
    for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
        try {
            return await useCase.execute(input);
        } catch (error) {
            if (attempt === retryAttempts) {
                throw error;
            }

            const delayMs = Math.round(retryDelayMs * attempt + Math.random() * retryDelayMs);
            logger.warn({
                msg: 'seed.products.retrying_create',
                name: input.name,
                attempt,
                delayMs,
                error: error instanceof Error ? error.message : 'unknown_error',
            });
            await sleep(delayMs);
        }
    }

    throw new Error(`Failed to create product ${input.name}`);
}

async function run() {
    const app = await NestFactory.createApplicationContext(PlaygroundModule, {
        bufferLogs: true,
    });
    const logger = new Logger('ProductsSeed');

    try {
        const args = parseArgs(process.argv.slice(2));
        const useCase = app.get<IngestProductUseCase>(TOKENS.IngestProductUseCase, { strict: false });
        let created = 0;

        logger.log({
            msg: 'seed.products.started',
            count: args.count,
            pauseEvery: args.pauseEvery,
            pauseMs: args.pauseMs,
            retryAttempts: args.retryAttempts,
            retryDelayMs: args.retryDelayMs,
            prefix: args.prefix,
        });

        for (let index = 0; index < args.count; index += 1) {
            const product = buildProduct(index, args.prefix);
            const createdProduct = await createWithRetry(
                useCase,
                logger,
                product,
                args.retryAttempts,
                args.retryDelayMs,
            );

            created += 1;
            logger.log({
                msg: 'seed.products.created',
                progress: `${created}/${args.count}`,
                productId: createdProduct.id,
                name: product.name,
            });

            if (created < args.count && created % args.pauseEvery === 0) {
                logger.log({
                    msg: 'seed.products.batch_pause',
                    created,
                    pauseMs: args.pauseMs,
                });
                await sleep(args.pauseMs);
            }
        }

        logger.log({
            msg: 'seed.products.completed',
            created,
        });
    } finally {
        await app.close();
    }
}

run().catch((error) => {
    Logger.error(error instanceof Error ? error.message : 'Unknown seed error', undefined, 'ProductsSeed');
    process.exit(1);
});