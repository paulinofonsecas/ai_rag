import { Body, Controller, Headers, Inject, Logger, Post } from '@nestjs/common';

import { IngestProductUseCase } from 'src/application/use-cases/ingest-product.use-case';
import { TOKENS } from 'src/infrastructure/tokens';
import { CreateProductDto } from 'src/presentation/dto/create-product.dto';

@Controller('products')
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(
    @Inject(TOKENS.IngestProductUseCase)
    private readonly useCase: IngestProductUseCase,
  ) {}

  @Post()
  async create(@Body() body: CreateProductDto, @Headers('x-correlation-id') correlationId?: string) {
    const product = await this.useCase.execute(body);
    this.logger.log({
      msg: 'product.created',
      productId: product.id,
      correlationId: correlationId ?? 'n/a',
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
}
