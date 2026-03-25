import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

import { AppModule } from 'src/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use((req: Request, res: Response, next: () => void) => {
    const incoming = req.header('x-correlation-id');
    const correlationId = incoming && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader('x-correlation-id', correlationId);
    next();
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`HTTP server started on port ${port}`, 'Bootstrap');
}

bootstrap();
