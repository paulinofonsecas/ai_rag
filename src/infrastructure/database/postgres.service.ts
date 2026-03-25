import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class PostgresService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      host: this.configService.getOrThrow<string>('database.host'),
      port: this.configService.getOrThrow<number>('database.port'),
      database: this.configService.getOrThrow<string>('database.name'),
      user: this.configService.getOrThrow<string>('database.user'),
      password: this.configService.getOrThrow<string>('database.password'),
      max: this.configService.get<number>('database.poolMax', 20),
    });
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
