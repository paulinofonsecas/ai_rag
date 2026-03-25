import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkersModule } from 'src/workers/workers.module';

async function bootstrap() {
    await NestFactory.createApplicationContext(WorkersModule, {
        bufferLogs: true,
    });

    Logger.log('Worker is running and waiting for jobs', 'WorkerBootstrap');
}

bootstrap();
