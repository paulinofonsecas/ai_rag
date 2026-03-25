import { Module } from '@nestjs/common';

import { InfrastructureModule } from 'src/infrastructure/infrastructure.module';
import { ProductController } from 'src/presentation/controllers/product.controller';
import { SearchController } from 'src/presentation/controllers/search.controller';

@Module({
    imports: [InfrastructureModule],
    controllers: [SearchController, ProductController],
})
export class PresentationModule { }
