import {
    Controller,
    Get,
    Headers,
    Inject,
    Logger,
    Query,
} from '@nestjs/common';

import { SearchProductsUseCase } from 'src/application/use-cases/search-products.use-case';
import { TOKENS } from 'src/infrastructure/tokens';
import { SearchQueryDto } from 'src/presentation/dto/search-query.dto';

@Controller('search')
export class SearchController {
    private readonly logger = new Logger(SearchController.name);

    constructor(
        @Inject(TOKENS.SearchProductsUseCase)
        private readonly useCase: SearchProductsUseCase,
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
            correlationId: correlationId ?? 'n/a',
        });

        const results = await this.useCase.execute({
            query: query.q,
            limit: query.limit,
            offset: query.offset,
            rrfK: query.rrfK,
        });

        this.logger.log({
            msg: 'search.response_ready',
            q: query.q,
            correlationId: correlationId ?? 'n/a',
            latencyMs: Date.now() - start,
            resultCount: results.length,
        });

        return {
            query: query.q,
            count: results.length,
            items: results.map((item) => ({
                id: item.product.id,
                name: item.product.name,
                description: item.product.description,
                category: item.product.category,
                scores: {
                    rrf: item.rrfScore,
                    semantic: item.semanticScore,
                    lexical: item.lexicalScore,
                },
                ranks: {
                    semantic: item.semanticRank,
                    lexical: item.lexicalRank,
                },
            })),
        };
    }
}
