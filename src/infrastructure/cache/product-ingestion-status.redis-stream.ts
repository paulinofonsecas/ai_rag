import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type ProductIngestionStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type ProductIngestionStatusEvent = {
    productId: string;
    status: ProductIngestionStatus;
    at: string;
    message?: string;
};

@Injectable()
export class ProductIngestionStatusRedisStream implements OnModuleDestroy {
    private readonly logger = new Logger(ProductIngestionStatusRedisStream.name);
    private readonly publisher: Redis;
    private readonly redisConfig: { host: string; port: number; password?: string };
    private readonly ttlSeconds: number;
    private readonly channelPrefix: string;
    private readonly latestPrefix: string;

    constructor(private readonly configService: ConfigService) {
        this.redisConfig = {
            host: this.configService.getOrThrow<string>('queue.host'),
            port: this.configService.getOrThrow<number>('queue.port'),
            password: this.configService.get<string>('queue.password'),
        };

        this.publisher = new Redis(this.redisConfig);
        this.ttlSeconds = this.configService.get<number>('history.redis.ttlSeconds') ?? 60 * 60 * 24 * 7;
        this.channelPrefix = 'product:ingestion:status';
        this.latestPrefix = 'product:ingestion:latest';
    }

    async publishStatus(event: ProductIngestionStatusEvent): Promise<void> {
        const payload = JSON.stringify(event);
        const latestKey = this.getLatestKey(event.productId);

        await this.publisher
            .multi()
            .set(latestKey, payload, 'EX', this.ttlSeconds)
            .publish(this.getChannel(event.productId), payload)
            .exec();
    }

    async getLatestStatus(productId: string): Promise<ProductIngestionStatusEvent | null> {
        const payload = await this.publisher.get(this.getLatestKey(productId));

        if (!payload) {
            return null;
        }

        try {
            return JSON.parse(payload) as ProductIngestionStatusEvent;
        } catch {
            return null;
        }
    }

    async subscribe(
        productId: string,
        onEvent: (event: ProductIngestionStatusEvent) => void,
    ): Promise<() => Promise<void>> {
        const subscriber = new Redis(this.redisConfig);
        const channel = this.getChannel(productId);

        await subscriber.subscribe(channel);

        const onMessage = (_channel: string, message: string) => {
            try {
                const event = JSON.parse(message) as ProductIngestionStatusEvent;
                onEvent(event);
            } catch (error) {
                this.logger.warn(`invalid status payload: ${error instanceof Error ? error.message : String(error)}`);
            }
        };

        subscriber.on('message', onMessage);

        return async () => {
            try {
                subscriber.off('message', onMessage);
                await subscriber.unsubscribe(channel);
                await subscriber.quit();
            } catch (error) {
                this.logger.warn(`subscriber cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        };
    }

    async onModuleDestroy() {
        try {
            await this.publisher.quit();
        } catch (error) {
            this.logger.warn(`publisher quit failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private getChannel(productId: string): string {
        return `${this.channelPrefix}:${productId}`;
    }

    private getLatestKey(productId: string): string {
        return `${this.latestPrefix}:${productId}`;
    }
}
