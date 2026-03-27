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
import { SearchHistoryRedisStore } from 'src/infrastructure/cache/search-history.redis-store';
import { PostgresService } from 'src/infrastructure/database/postgres.service';
import { TOKENS } from 'src/infrastructure/tokens';
import { SearchQueryDto } from 'src/presentation/dto/search-query.dto';

type SearchItemDto = {
    id: string;
    name: string;
    description: string;
    category: string;
    imageUrl: string | null;
    scores: {
        rrf: number;
        semantic: number;
        lexical: number;
    };
    ranks: {
        semantic: number | null;
        lexical: number | null;
    };
};

@Controller('search')
export class SearchController {
    private readonly logger = new Logger(SearchController.name);

    constructor(
        @Inject(TOKENS.SearchProductsUseCase)
        private readonly useCase: SearchProductsUseCase,
        @Inject(TOKENS.SearchRepository)
        private readonly searchRepository: SearchRepository,
        private readonly postgresService: PostgresService,
        private readonly searchHistoryStore: SearchHistoryRedisStore,
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
            let vectorItems: SearchItemDto[] = [];

            const onStep: OnStep = (event) => {
                if (event.step === 'vector_search' && event.status === 'completed') {
                    const preRerankResults = event.meta?.preRerankResults;
                    if (Array.isArray(preRerankResults)) {
                        vectorItems = this.mapResults(preRerankResults as Awaited<ReturnType<SearchProductsUseCase['execute']>>);
                    }
                }

                const compactMeta = this.stripPreRerankMeta(event.meta);
                steps.push({
                    ...event,
                    meta: compactMeta,
                    at: new Date().toISOString(),
                });
                subscriber.next({ data: { ...event, meta: compactMeta } });
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
                            vectorItems,
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
            await this.searchHistoryStore.appendRun({
                correlationId: input.correlationId,
                query: input.query,
                startedAt: input.startedAt.toISOString(),
                completedAt: input.completedAt.toISOString(),
                totalMs,
                resultCount: input.resultCount,
                steps: input.steps,
                errorMessage: input.errorMessage,
            });
        } catch (error) {
            this.logger.error({
                msg: 'search.stream.persist_failed',
                correlationId: input.correlationId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    private mapResults(results: Awaited<ReturnType<SearchProductsUseCase['execute']>>): SearchItemDto[] {
        return results
            .map((item) => ({
                id: item.product.id,
                name: item.product.name,
                description: item.product.description,
                category: item.product.category,
                imageUrl: item.product.imageUrl ?? null,
                scores: {
                    rrf: item.rrfScore ?? 0,
                    semantic: item.semanticScore ?? 0,
                    lexical: item.lexicalScore ?? 0,
                },
                ranks: {
                    semantic: item.semanticRank ?? null,
                    lexical: item.lexicalRank ?? null,
                },
            }));
    }

    private stripPreRerankMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
        if (!meta) {
            return undefined;
        }

        const { preRerankResults: _ignored, ...rest } = meta;
        return rest;
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
