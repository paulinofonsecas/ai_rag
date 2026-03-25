import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { IngestProductUseCase } from 'src/application/use-cases/ingest-product.use-case';
import { SearchProductsUseCase } from 'src/application/use-cases/search-products.use-case';
import { HybridSearchResult } from 'src/domain/interfaces/search-repository.interface';
import { TOKENS } from 'src/infrastructure/tokens';
import { PlaygroundModule } from 'src/playground/playground.module';

function parseArgs(argv: string[]) {
    const [command, ...rest] = argv;
    const args = new Map<string, string>();

    for (let i = 0; i < rest.length; i += 1) {
        const value = rest[i];
        if (!value.startsWith('--')) {
            continue;
        }

        const key = value.replace('--', '');
        const next = rest[i + 1];
        if (!next || next.startsWith('--')) {
            args.set(key, 'true');
            continue;
        }

        args.set(key, next);
        i += 1;
    }

    return { command, args };
}

async function run() {
    const app = await NestFactory.createApplicationContext(PlaygroundModule, {
        bufferLogs: true,
    });

    const logger = new Logger('PlaygroundCLI');

    try {
        const { command, args } = parseArgs(process.argv.slice(2));

        if (command === 'ingest') {
            const useCase = app.get<IngestProductUseCase>(TOKENS.IngestProductUseCase, { strict: false });

            const name = args.get('name');
            const description = args.get('description');
            const category = args.get('category');

            if (!name || !description || !category) {
                throw new Error('Missing required args for ingest: --name --description --category');
            }

            const product = await useCase.execute({
                name,
                description,
                category,
            });

            logger.log({
                msg: 'playground.ingest.ok',
                productId: product.id,
            });

            return;
        }

        if (command === 'search') {
            const useCase = app.get<SearchProductsUseCase>(TOKENS.SearchProductsUseCase, { strict: false });

            const query = args.get('query');
            const limit = Number(args.get('limit') ?? '10');
            const offset = Number(args.get('offset') ?? '0');
            const rrfK = Number(args.get('rrfk') ?? '60');

            if (!query) {
                throw new Error('Missing required arg for search: --query');
            }

            const results = await useCase.execute({
                query,
                limit,
                offset,
                rrfK,
            });

            logger.log({
                msg: 'playground.search.ok',
                count: results.length,
                items: results.map((item: HybridSearchResult) => ({
                    id: item.product.id,
                    name: item.product.name,
                    rrfScore: item.rrfScore,
                    semanticScore: item.semanticScore,
                    lexicalScore: item.lexicalScore,
                })),
            });

            return;
        }

        logger.log(
            'Usage: npm run playground -- ingest --name "..." --description "..." --category "..." | search --query "..." [--limit 10] [--offset 0] [--rrfk 60]',
        );
    } finally {
        await app.close();
    }
}

run().catch((error) => {
    Logger.error(error instanceof Error ? error.message : 'Unknown CLI error', undefined, 'PlaygroundCLI');
    process.exit(1);
});
