import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { promises as fs } from 'fs';
import * as path from 'path';

import { IngestProductUseCase } from 'src/application/use-cases/ingest-product.use-case';
import { PostgresService } from 'src/infrastructure/database/postgres.service';
import { TOKENS } from 'src/infrastructure/tokens';
import { PlaygroundModule } from 'src/playground/playground.module';

type SeedArgs = {
    count?: number;
    pauseEvery: number;
    pauseMs: number;
    retryAttempts: number;
    retryDelayMs: number;
};

type SourceRecord = {
    id?: unknown;
    title?: unknown;
    description?: unknown;
};

type ProductSeedInput = {
    name: string;
    category: string;
    description: string;
};

type FileBatch = {
    fileName: string;
    category: string;
    records: SourceRecord[];
};

type FileStats = {
    read: number;
    created: number;
    skippedDuplicate: number;
    skippedInvalid: number;
    failed: number;
};

const NAME_MIN = 2;
const NAME_MAX = 255;
const DESCRIPTION_MIN = 2;
const DESCRIPTION_MAX = 5000;
const CATEGORY_MIN = 2;
const CATEGORY_MAX = 120;

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

    return {
        count: parseOptionalCount(args.get('count')),
        pauseEvery: clampNumber(args.get('pause-every'), 25, 1, 5000),
        pauseMs: clampNumber(args.get('pause-ms'), 1500, 0, 60000),
        retryAttempts: clampNumber(args.get('retry-attempts'), 3, 1, 20),
        retryDelayMs: clampNumber(args.get('retry-delay-ms'), 750, 0, 30000),
    };
}

function parseOptionalCount(raw: string | undefined): number | undefined {
    if (!raw) {
        return undefined;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
        return undefined;
    }

    return Math.min(100000, Math.max(1, Math.floor(parsed)));
}

function clampNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
    const parsed = Number(raw ?? fallback);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function normalizeCategoryFromFile(fileName: string): string {
    return fileName.replace(/\.json$/i, '').trim().toLowerCase();
}

function dedupeKey(name: string, category: string): string {
    return `${name.trim().toLowerCase()}::${category.trim().toLowerCase()}`;
}

function normalizeRecord(record: SourceRecord, category: string): ProductSeedInput | null {
    const name = (typeof record.title === 'string' ? record.title : '').trim();
    const descriptionSource = typeof record.description === 'string' ? record.description : name;
    const description = descriptionSource.trim();
    const normalizedCategory = category.trim();

    if (
        name.length < NAME_MIN ||
        name.length > NAME_MAX ||
        description.length < DESCRIPTION_MIN ||
        description.length > DESCRIPTION_MAX ||
        normalizedCategory.length < CATEGORY_MIN ||
        normalizedCategory.length > CATEGORY_MAX
    ) {
        return null;
    }

    return {
        name,
        description,
        category: normalizedCategory,
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
                msg: 'seed.products-files.retrying_create',
                name: input.name,
                category: input.category,
                attempt,
                delayMs,
                error: error instanceof Error ? error.message : 'unknown_error',
            });
            await sleep(delayMs);
        }
    }

    throw new Error(`Failed to create product ${input.name}`);
}

async function loadFileBatches(dataDir: string): Promise<FileBatch[]> {
    const entries = await fs.readdir(dataDir, { withFileTypes: true });
    const jsonFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));

    const batches: FileBatch[] = [];
    for (const fileName of jsonFiles) {
        const fullPath = path.join(dataDir, fileName);
        const raw = await fs.readFile(fullPath, 'utf8');
        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            throw new Error(`Seed source must be an array: ${fileName}`);
        }

        batches.push({
            fileName,
            category: normalizeCategoryFromFile(fileName),
            records: parsed as SourceRecord[],
        });
    }

    return batches;
}

async function productExists(db: PostgresService, name: string, category: string): Promise<boolean> {
    const result = await db.query<{ exists: boolean }>(
        `SELECT EXISTS (
            SELECT 1
            FROM products
            WHERE lower(name) = lower($1)
              AND lower(category) = lower($2)
        ) AS exists`,
        [name, category],
    );

    return Boolean(result.rows[0]?.exists);
}

async function run() {
    const app = await NestFactory.createApplicationContext(PlaygroundModule, {
        bufferLogs: true,
    });
    const logger = new Logger('ProductsFilesSeed');

    try {
        const args = parseArgs(process.argv.slice(2));
        const useCase = app.get<IngestProductUseCase>(TOKENS.IngestProductUseCase, { strict: false });
        const db = app.get(PostgresService, { strict: false });
        const dataDir = path.join(__dirname, 'dados');
        const batches = await loadFileBatches(dataDir);

        const stats = new Map<string, FileStats>();
        const seenKeys = new Set<string>();

        let processed = 0;
        let created = 0;
        let skippedDuplicate = 0;
        let skippedInvalid = 0;
        let failed = 0;

        logger.log({
            msg: 'seed.products-files.started',
            sourceDir: dataDir,
            files: batches.length,
            countLimit: args.count ?? 'all',
            pauseEvery: args.pauseEvery,
            pauseMs: args.pauseMs,
            retryAttempts: args.retryAttempts,
            retryDelayMs: args.retryDelayMs,
        });

        outer: for (const batch of batches) {
            stats.set(batch.fileName, {
                read: 0,
                created: 0,
                skippedDuplicate: 0,
                skippedInvalid: 0,
                failed: 0,
            });

            for (const record of batch.records) {
                if (args.count && processed >= args.count) {
                    break outer;
                }

                const fileStats = stats.get(batch.fileName);
                if (!fileStats) {
                    continue;
                }

                processed += 1;
                fileStats.read += 1;

                const input = normalizeRecord(record, batch.category);
                if (!input) {
                    skippedInvalid += 1;
                    fileStats.skippedInvalid += 1;
                    continue;
                }

                const key = dedupeKey(input.name, input.category);
                if (seenKeys.has(key) || (await productExists(db, input.name, input.category))) {
                    skippedDuplicate += 1;
                    fileStats.skippedDuplicate += 1;
                    seenKeys.add(key);
                    continue;
                }

                try {
                    const createdProduct = await createWithRetry(
                        useCase,
                        logger,
                        input,
                        args.retryAttempts,
                        args.retryDelayMs,
                    );

                    created += 1;
                    fileStats.created += 1;
                    seenKeys.add(key);

                    logger.log({
                        msg: 'seed.products-files.created',
                        progress: args.count ? `${processed}/${args.count}` : processed,
                        productId: createdProduct.id,
                        file: batch.fileName,
                        name: input.name,
                    });

                    if (created % args.pauseEvery === 0) {
                        logger.log({
                            msg: 'seed.products-files.batch_pause',
                            created,
                            pauseMs: args.pauseMs,
                        });
                        await sleep(args.pauseMs);
                    }
                } catch (error) {
                    failed += 1;
                    fileStats.failed += 1;
                    logger.error({
                        msg: 'seed.products-files.create_failed',
                        file: batch.fileName,
                        name: input.name,
                        error: error instanceof Error ? error.message : 'unknown_error',
                    });
                }
            }
        }

        for (const [fileName, fileStats] of stats.entries()) {
            logger.log({
                msg: 'seed.products-files.file_summary',
                file: fileName,
                ...fileStats,
            });
        }

        logger.log({
            msg: 'seed.products-files.completed',
            processed,
            created,
            skippedDuplicate,
            skippedInvalid,
            failed,
        });
    } finally {
        await app.close();
    }
}

run().catch((error) => {
    Logger.error(error instanceof Error ? error.message : 'Unknown seed error', undefined, 'ProductsFilesSeed');
    process.exit(1);
});
