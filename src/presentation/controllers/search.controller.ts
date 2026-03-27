import {
    Controller,
    Get,
    Headers,
    Inject,
    Logger,
    MessageEvent,
    Query,
    Response,
    Sse,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { Observable } from 'rxjs';

import { OnStep, StepEvent } from 'src/application/services/hybrid-search.orchestrator';
import { SearchProductsUseCase } from 'src/application/use-cases/search-products.use-case';
import { SearchRepository } from 'src/domain/interfaces/search-repository.interface';
import { PostgresService } from 'src/infrastructure/database/postgres.service';
import { TOKENS } from 'src/infrastructure/tokens';
import { SearchQueryDto } from 'src/presentation/dto/search-query.dto';

@Controller('search')
export class SearchController {
    private readonly logger = new Logger(SearchController.name);
    private analyticsTableReady = false;

    constructor(
        @Inject(TOKENS.SearchProductsUseCase)
        private readonly useCase: SearchProductsUseCase,
        @Inject(TOKENS.SearchRepository)
        private readonly searchRepository: SearchRepository,
        private readonly postgresService: PostgresService,
    ) { }

    @Get()
    async search(@Query() query: SearchQueryDto, @Headers('x-correlation-id') correlationId?: string) {
        const start = Date.now();
        this.logger.log({
            msg: 'search.request_received',
            q: query.q,
            limit: query.limit ?? 10,
            offset: query.offset ?? 0,
            rrfK: query.rrfK ?? 60,
            rerank: query.rerank ?? true,
            rerankCandidates: query.rerankCandidates,
            correlationId: correlationId ?? 'n/a',
        });

        const results = await this.useCase.execute({
            query: query.q,
            limit: query.limit,
            offset: query.offset,
            rrfK: query.rrfK,
            rerank: query.rerank,
            rerankCandidates: query.rerankCandidates,
        });

        this.logger.log({
            msg: 'search.response_ready',
            q: query.q,
            correlationId: correlationId ?? 'n/a',
            latencyMs: Date.now() - start,
            resultCount: results.length,
        });

        const items = this.mapResults(results);

        return {
            query: query.q,
            count: items.length,
            items,
        };
    }

    @Sse('stream')
    searchStream(
        @Query() query: SearchQueryDto,
        @Headers('x-correlation-id') correlationId?: string,
    ): Observable<MessageEvent> {
        return new Observable((subscriber) => {
            const startedAt = new Date();
            const steps: Array<StepEvent & { at: string }> = [];
            const correlation = correlationId ?? 'n/a';

            const onStep: OnStep = (event) => {
                steps.push({
                    ...event,
                    at: new Date().toISOString(),
                });
                subscriber.next({ data: event });
            };

            this.useCase
                .execute(
                    {
                        query: query.q,
                        limit: query.limit,
                        offset: query.offset,
                        rrfK: query.rrfK,
                        rerank: query.rerank,
                        rerankCandidates: query.rerankCandidates,
                    },
                    onStep,
                )
                .then(async (results) => {
                    const items = this.mapResults(results);
                    const completedAt = new Date();

                    await this.persistSearchRun({
                        correlationId: correlation,
                        query: query.q,
                        startedAt,
                        completedAt,
                        resultCount: items.length,
                        steps,
                    });

                    subscriber.next({
                        data: {
                            type: 'done',
                            query: query.q,
                            count: items.length,
                            items,
                        },
                    });
                    subscriber.complete();
                })
                .catch(async (err: unknown) => {
                    const completedAt = new Date();
                    await this.persistSearchRun({
                        correlationId: correlation,
                        query: query.q,
                        startedAt,
                        completedAt,
                        resultCount: 0,
                        steps,
                        errorMessage: err instanceof Error ? err.message : 'Unknown error',
                    });

                    subscriber.next({
                        data: {
                            type: 'error',
                            message: err instanceof Error ? err.message : 'Unknown error',
                        },
                    });
                    subscriber.complete();
                });
        });
    }

    private async persistSearchRun(input: {
        correlationId: string;
        query: string;
        startedAt: Date;
        completedAt: Date;
        resultCount: number;
        steps: Array<StepEvent & { at: string }>;
        errorMessage?: string;
    }) {
        const totalMs = input.completedAt.getTime() - input.startedAt.getTime();

        try {
            await this.ensureAnalyticsTable();
            await this.postgresService.query(
                `
                    INSERT INTO search_step_runs (
                        correlation_id,
                        query,
                        started_at,
                        completed_at,
                        total_ms,
                        result_count,
                        steps,
                        error_message
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
                `,
                [
                    input.correlationId,
                    input.query,
                    input.startedAt,
                    input.completedAt,
                    totalMs,
                    input.resultCount,
                    JSON.stringify(input.steps),
                    input.errorMessage ?? null,
                ],
            );
        } catch (error) {
            this.logger.error({
                msg: 'search.stream.persist_failed',
                correlationId: input.correlationId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    private async ensureAnalyticsTable() {
        if (this.analyticsTableReady) {
            return;
        }

        await this.postgresService.query(`
            CREATE TABLE IF NOT EXISTS search_step_runs (
                id BIGSERIAL PRIMARY KEY,
                correlation_id TEXT NOT NULL,
                query TEXT NOT NULL,
                started_at TIMESTAMPTZ NOT NULL,
                completed_at TIMESTAMPTZ NOT NULL,
                total_ms INTEGER NOT NULL,
                result_count INTEGER NOT NULL,
                steps JSONB NOT NULL,
                error_message TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `);

        await this.postgresService.query(`
            CREATE INDEX IF NOT EXISTS idx_search_step_runs_created_at
            ON search_step_runs (created_at DESC)
        `);

        await this.postgresService.query(`
            CREATE INDEX IF NOT EXISTS idx_search_step_runs_correlation_id
            ON search_step_runs (correlation_id)
        `);

        this.analyticsTableReady = true;
    }

    private mapResults(results: Awaited<ReturnType<SearchProductsUseCase['execute']>>) {
        return results
            .map((item) => ({
                id: item.product.id,
                name: item.product.name,
                description: item.product.description,
                category: item.product.category,
                scores: {
                    rrf: item.rrfScore ?? 0,
                    semantic: item.semanticScore ?? 0,
                    lexical: item.lexicalScore ?? 0,
                },
                ranks: {
                    semantic: item.semanticRank ?? null,
                    lexical: item.lexicalRank ?? null,
                },
            }))
            .sort((left, right) => {
                const leftSemantic = left.ranks.semantic ?? Number.MAX_SAFE_INTEGER;
                const rightSemantic = right.ranks.semantic ?? Number.MAX_SAFE_INTEGER;
                if (leftSemantic !== rightSemantic) return leftSemantic - rightSemantic;

                const leftLexical = left.ranks.lexical ?? Number.MAX_SAFE_INTEGER;
                const rightLexical = right.ranks.lexical ?? Number.MAX_SAFE_INTEGER;
                if (leftLexical !== rightLexical) return leftLexical - rightLexical;

                return left.id.localeCompare(right.id);
            });
    }

    @Get('export-embeddings')
    async exportEmbeddings(
        @Response() res: ExpressResponse,
        @Headers('x-correlation-id') correlationId?: string,
    ) {
        this.logger.log({
            msg: 'export_embeddings.request_received',
            correlationId: correlationId ?? 'n/a',
        });

        try {
            const products = await this.searchRepository.getAllProducts();

            // Create TSV header
            const headers = ['id', 'name', 'description', 'category', 'embedding', 'created_at', 'updated_at'];
            const tsvLines = [headers.join('\t')];

            // Add products as TSV rows
            for (const product of products) {
                const embeddingString = product.embedding ? `"[${product.embedding.join(',')}]"` : '""';
                const row = [
                    product.id,
                    `"${product.name.replace(/"/g, '""')}"`,
                    `"${product.description.replace(/"/g, '""')}"`,
                    `"${product.category.replace(/"/g, '""')}"`,
                    embeddingString,
                    product.createdAt.toISOString(),
                    product.updatedAt.toISOString(),
                ];
                tsvLines.push(row.join('\t'));
            }

            const tsvContent = tsvLines.join('\n');

            res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="embeddings-${Date.now()}.tsv"`);
            res.setHeader('x-correlation-id', correlationId ?? 'n/a');
            res.send(Buffer.from(tsvContent, 'utf-8'));

            this.logger.log({
                msg: 'export_embeddings.response_ready',
                correlationId: correlationId ?? 'n/a',
                productCount: products.length,
            });
        } catch (error) {
            this.logger.error({
                msg: 'export_embeddings.error',
                error: error instanceof Error ? error.message : String(error),
                correlationId: correlationId ?? 'n/a',
            });
            throw error;
        }
    }

    @Get('embeddings')
    async listEmbeddings(
        @Headers('x-correlation-id') correlationId?: string,
        @Query('ids') ids?: string,
    ) {
        this.logger.log({
            msg: 'list_embeddings.request_received',
            correlationId: correlationId ?? 'n/a',
            ids: ids ?? 'n/a',
        });

        const requestedIds = new Set(
            (ids ?? '')
                .split(',')
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
        );

        const products = await this.searchRepository.getAllProducts();
        const items = products
            .filter((product) => requestedIds.size === 0 || requestedIds.has(product.id))
            .filter((product) => (product.embedding?.length ?? 0) > 1)
            .map((product) => ({
                id: product.id,
                name: product.name,
                description: product.description,
                category: product.category,
                embedding: product.embedding,
            }));

        this.logger.log({
            msg: 'list_embeddings.response_ready',
            correlationId: correlationId ?? 'n/a',
            productCount: items.length,
        });

        return {
            count: items.length,
            items,
        };
    }
}
