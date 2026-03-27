import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { promises as fs } from 'fs';
import * as path from 'path';

import { PostgresService } from 'src/infrastructure/database/postgres.service';
import { PlaygroundModule } from 'src/playground/playground.module';

type SeedArgs = {
    batchSize: number;
    force: boolean;
};

type ProductRow = {
    id: string;
    name: string;
    category: string;
    image_url: string | null;
};

type SourceRecord = {
    title?: unknown;
    featured_image?: {
        source?: unknown;
    };
};

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
        batchSize: clampNumber(args.get('batch-size'), 300, 1, 5000),
        force: (args.get('force') ?? 'false').toLowerCase() === 'true',
    };
}

function clampNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
    const parsed = Number(raw ?? fallback);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function normalizeText(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeCategoryFromFile(fileName: string): string {
    return fileName.replace(/\.json$/i, '').trim().toLowerCase();
}

function sourceKey(name: string, category: string): string {
    return `${normalizeText(name)}::${normalizeText(category)}`;
}

async function loadImageSources(dataDir: string) {
    const entries = await fs.readdir(dataDir, { withFileTypes: true });
    const jsonFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));

    const sourceByKey = new Map<string, string>();

    for (const fileName of jsonFiles) {
        const category = normalizeCategoryFromFile(fileName);
        const fullPath = path.join(dataDir, fileName);
        const raw = await fs.readFile(fullPath, 'utf8');
        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            continue;
        }

        for (const record of parsed as SourceRecord[]) {
            const title = typeof record.title === 'string' ? record.title.trim() : '';
            const source = typeof record.featured_image?.source === 'string'
                ? record.featured_image.source.trim()
                : '';

            if (!title || !source) {
                continue;
            }

            sourceByKey.set(sourceKey(title, category), source);
        }
    }

    return sourceByKey;
}

async function ensureSchema(db: PostgresService) {
    await db.query(`
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS image_url TEXT
    `);
}

async function run() {
    const app = await NestFactory.createApplicationContext(PlaygroundModule, {
        bufferLogs: true,
    });
    const logger = new Logger('ProductsImageSubseed');

    try {
        const args = parseArgs(process.argv.slice(2));
        const db = app.get(PostgresService, { strict: false });
        const dataDir = path.join(__dirname, 'dados');
        const sourceByKey = await loadImageSources(dataDir);

        await ensureSchema(db);

        logger.log({
            msg: 'seed.products-image.started',
            batchSize: args.batchSize,
            force: args.force,
            sourceCount: sourceByKey.size,
        });

        const query = args.force
            ? `
                SELECT id, name, category, image_url
                FROM products
                ORDER BY created_at DESC
                LIMIT $1
              `
            : `
                SELECT id, name, category, image_url
                FROM products
                WHERE image_url IS NULL OR btrim(image_url) = ''
                ORDER BY created_at DESC
                LIMIT $1
              `;

        let totalUpdated = 0;
        let totalNoSource = 0;

        while (true) {
            const { rows } = await db.query<ProductRow>(query, [args.batchSize]);
            if (rows.length === 0) {
                break;
            }

            let batchUpdated = 0;

            for (const row of rows) {
                const imageUrl = sourceByKey.get(sourceKey(row.name, row.category));
                if (!imageUrl) {
                    totalNoSource += 1;
                    continue;
                }

                await db.query(
                    `
                        UPDATE products
                        SET image_url = $2,
                            updated_at = now()
                        WHERE id = $1
                    `,
                    [row.id, imageUrl],
                );

                batchUpdated += 1;
            }

            totalUpdated += batchUpdated;
            logger.log({
                msg: 'seed.products-image.batch_updated',
                batchUpdated,
                totalUpdated,
                totalNoSource,
            });

            if (rows.length < args.batchSize) {
                break;
            }
        }

        logger.log({
            msg: 'seed.products-image.completed',
            totalUpdated,
            totalNoSource,
            mode: args.force ? 'all' : 'only-missing',
        });
    } finally {
        await app.close();
    }
}

run().catch((error) => {
    Logger.error(
        error instanceof Error ? error.message : 'Unknown seed error',
        undefined,
        'ProductsImageSubseed',
    );
    process.exit(1);
});
