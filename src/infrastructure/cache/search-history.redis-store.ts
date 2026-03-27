import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type SearchStepHistoryEntry = {
    type: 'step';
    step: 'embedding' | 'vector_search' | 'rerank';
    status: 'started' | 'completed' | 'skipped' | 'error';
    durationMs?: number;
    at: string;
};

export type SearchRunHistoryEntry = {
    correlationId: string;
    query: string;
    startedAt: string;
    completedAt: string;
    totalMs: number;
    resultCount: number;
    steps: SearchStepHistoryEntry[];
    errorMessage?: string;
};

@Injectable()
export class SearchHistoryRedisStore implements OnModuleDestroy {
    private readonly logger = new Logger(SearchHistoryRedisStore.name);
    private readonly redis: Redis;
    private readonly listKey: string;
    private readonly ttlSeconds: number;
    private readonly maxEntries: number;

    constructor(private readonly configService: ConfigService) {
        this.redis = new Redis({
            host: this.configService.getOrThrow<string>('queue.host'),
            port: this.configService.getOrThrow<number>('queue.port'),
            password: this.configService.get<string>('queue.password'),
        });

        this.listKey = this.configService.get<string>('history.redis.key') ?? 'search:history:runs';
        this.ttlSeconds = this.configService.get<number>('history.redis.ttlSeconds') ?? 60 * 60 * 24 * 7;
        this.maxEntries = this.configService.get<number>('history.redis.maxEntries') ?? 500;
    }

    async appendRun(entry: SearchRunHistoryEntry): Promise<void> {
        const payload = JSON.stringify(entry);

        await this.redis
            .multi()
            .lpush(this.listKey, payload)
            .ltrim(this.listKey, 0, this.maxEntries - 1)
            .expire(this.listKey, this.ttlSeconds)
            .exec();
    }

    async onModuleDestroy() {
        try {
            await this.redis.quit();
        } catch (error) {
            this.logger.warn(`redis.quit failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
