import { Body, Controller, Headers, Inject, Logger, MessageEvent, Param, Post, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';

import { IngestProductUseCase } from 'src/application/use-cases/ingest-product.use-case';
import { ProductIngestionStatusRedisStream } from 'src/infrastructure/cache/product-ingestion-status.redis-stream';
import { TOKENS } from 'src/infrastructure/tokens';
import { CreateProductDto } from 'src/presentation/dto/create-product.dto';

@Controller('products')
export class ProductController {
    private readonly logger = new Logger(ProductController.name);

    constructor(
        @Inject(TOKENS.IngestProductUseCase)
        private readonly useCase: IngestProductUseCase,
        private readonly statusStream: ProductIngestionStatusRedisStream,
    ) { }

    @Post()
    async create(@Body() body: CreateProductDto, @Headers('x-correlation-id') correlationId?: string) {
        this.logger.log({
            msg: 'product.create.request_received',
            correlationId: correlationId ?? 'n/a',
            name: body.name,
            category: body.category,
        });

        const product = await this.useCase.execute(body);

        await this.statusStream.publishStatus({
            productId: product.id,
            status: 'queued',
            at: new Date().toISOString(),
            message: 'Produto enfileirado para gerar embedding.',
        });

        this.logger.log({
            msg: 'product.create.response_ready',
            productId: product.id,
            correlationId: correlationId ?? 'n/a',
            status: 'queued_for_embedding',
        });

        return {
            id: product.id,
            name: product.name,
            description: product.description,
            category: product.category,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            status: 'queued_for_embedding',
        };
    }

    @Sse(':productId/stream')
    streamStatus(@Param('productId') productId: string): Observable<MessageEvent> {
        return new Observable((subscriber) => {
            let unsubscribe: (() => Promise<void>) | null = null;

            const setup = async () => {
                const latest = await this.statusStream.getLatestStatus(productId);
                if (latest) {
                    subscriber.next({ data: { type: 'status', ...latest } });
                }

                unsubscribe = await this.statusStream.subscribe(productId, (event) => {
                    subscriber.next({ data: { type: 'status', ...event } });

                    if (event.status === 'completed' || event.status === 'failed') {
                        subscriber.complete();
                    }
                });
            };

            void setup().catch((error) => {
                this.logger.error({
                    msg: 'product.stream_status.error',
                    productId,
                    error: error instanceof Error ? error.message : String(error),
                });

                subscriber.next({
                    data: {
                        type: 'error',
                        productId,
                        status: 'failed',
                        at: new Date().toISOString(),
                        message: 'Falha ao conectar no stream de status.',
                    },
                });
                subscriber.complete();
            });

            return () => {
                if (unsubscribe) {
                    void unsubscribe();
                }
            };
        });
    }
}
