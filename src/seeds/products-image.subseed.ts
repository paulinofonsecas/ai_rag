import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { PostgresService } from 'src/infrastructure/database/postgres.service';
import { PlaygroundModule } from 'src/playground/playground.module';

type SeedArgs = {
    batchSize: number;
    force: boolean;
};

type ProductRow = {
    id: string;
    image_url: string | null;
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

function buildImageUrl(id: string): string {
    // deterministic URL, stable for each product id
    return `https://picsum.photos/seed/product-${id}/640/640`;
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

        await ensureSchema(db);

        logger.log({
            msg: 'seed.products-image.started',
            batchSize: args.batchSize,
            force: args.force,
        });

        const query = args.force
            ? `
                SELECT id, image_url
                FROM products
                ORDER BY created_at DESC
                LIMIT $1
              `
            : `
                SELECT id, image_url
                FROM products
                WHERE image_url IS NULL OR btrim(image_url) = ''
                ORDER BY created_at DESC
                LIMIT $1
              `;

        let totalUpdated = 0;

        while (true) {
            const { rows } = await db.query<ProductRow>(query, [args.batchSize]);
            if (rows.length === 0) {
                break;
            }

            for (const row of rows) {
                const imageUrl = buildImageUrl(row.id);
                await db.query(
                    `
                        UPDATE products
                        SET image_url = $2,
                            updated_at = now()
                        WHERE id = $1
                    `,
                    [row.id, imageUrl],
                );
            }

            totalUpdated += rows.length;
            logger.log({
                msg: 'seed.products-image.batch_updated',
                batchUpdated: rows.length,
                totalUpdated,
            });

            if (rows.length < args.batchSize) {
                break;
            }
        }

        logger.log({
            msg: 'seed.products-image.completed',
            totalUpdated,
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
