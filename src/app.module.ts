import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from 'src/config/configuration';
import { validateEnv } from 'src/config/env.validation';
import { PresentationModule } from 'src/presentation/presentation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PresentationModule,
  ],
})
export class AppModule {}
