import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from 'src/config/configuration';
import { validateEnv } from 'src/config/env.validation';
import { InfrastructureModule } from 'src/infrastructure/infrastructure.module';
import { ProductIngestionProcessor } from 'src/workers/product-ingestion.processor';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
            validate: validateEnv,
        }),
        InfrastructureModule,
    ],
    providers: [ProductIngestionProcessor],
})
export class WorkersModule { }
