import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmbeddingService } from 'src/domain/interfaces/embedding-service.interface';

type GoogleGeminiEmbeddingResponse = {
    embedding: {
        values: number[];
    };
};

@Injectable()
export class EmbeddingAPIAdapter implements EmbeddingService {
    private readonly logger = new Logger(EmbeddingAPIAdapter.name);
    private readonly cache = new Map<string, number[]>();
    private readonly apiKey: string;
    private readonly model: string;
    private readonly dimensions: number;
    private readonly maxRetries: number;
    private readonly backoffMs: number;
    private readonly cooldownMs: number;
    private rateLimitedUntil = 0;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.getOrThrow<string>('embedding.apiKey');
        this.model = this.configService.get<string>('embedding.model', 'gemini-embedding-001');
        this.dimensions = this.configService.get<number>('embedding.dimensions', 1536);
        this.maxRetries = this.configService.get<number>('embedding.maxRetries', 6);
        this.backoffMs = this.configService.get<number>('embedding.backoffMs', 1000);
        this.cooldownMs = this.configService.get<number>('embedding.cooldownMs', 15000);
    }

    async generateProductEmbedding(input: string): Promise<number[]> {
        return this.generate(input);
    }

    async generateQueryEmbedding(input: string): Promise<number[]> {
        return this.generate(input);
    }

    private async generate(input: string): Promise<number[]> {
        const normalized = this.normalize(input);
        const cached = this.cache.get(normalized);
        if (cached) {
            return cached;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent`;

        const requestBody = {
            model: `models/${this.model}`,
            content: {
                parts: [
                    {
                        text: normalized,
                    },
                ],
            },
            outputDimensionality: this.dimensions,
        };

        try {
            const response = await this.sendWithRetry(url, requestBody, normalized);

            const payload = (await response.json()) as GoogleGeminiEmbeddingResponse;
            const vector = payload.embedding?.values;
            if (!vector || vector.length === 0) {
                throw new Error('Google Gemini Embedding API returned an empty embedding payload');
            }

            const normalizedVector = this.ensureDimensions(vector);

            this.cache.set(normalized, normalizedVector);
            return normalizedVector;
        } catch (error) {
            this.logger.error(
                `Error generating embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw error;
        }
    }

    private normalize(input: string) {
        return input
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private ensureDimensions(vector: number[]) {
        if (vector.length === this.dimensions) {
            return vector;
        }

        if (vector.length > this.dimensions) {
            this.logger.warn({
                msg: 'embedding.dimension_mismatch_truncated',
                model: this.model,
                receivedDimensions: vector.length,
                expectedDimensions: this.dimensions,
            });
            return vector.slice(0, this.dimensions);
        }

        throw new Error(
            `Embedding dimensions are too small: expected ${this.dimensions}, received ${vector.length}`,
        );
    }

    private async sendWithRetry(url: string, body: object, input: string): Promise<Response> {
        for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
            if (Date.now() < this.rateLimitedUntil) {
                const cooldownRemainingMs = this.rateLimitedUntil - Date.now();
                this.logger.warn({
                    msg: 'embedding.cooldown_active',
                    input,
                    cooldownRemainingMs,
                });
                await this.sleep(cooldownRemainingMs);
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey,
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                return response;
            }

            const errorText = await response.text();
            const isRetriable = response.status === 429 || response.status === 500 || response.status === 503 || response.status === 504;

            if (!isRetriable || attempt === this.maxRetries) {
                this.logger.error({
                    msg: 'embedding.request_failed',
                    input,
                    status: response.status,
                    attempt,
                    error: errorText,
                });
                throw new Error(`Google Gemini Embedding API request failed with status ${response.status}`);
            }

            const retryAfterMs = this.parseRetryAfterMs(response.headers.get('retry-after'));
            const retryInfoMs = this.parseRetryInfoDelayMs(errorText);
            const backoffWithJitter = Math.round(this.backoffMs * 2 ** attempt + Math.random() * this.backoffMs);
            const delayMs = Math.max(retryAfterMs, retryInfoMs, backoffWithJitter);

            if (response.status === 429) {
                this.rateLimitedUntil = Date.now() + Math.max(this.cooldownMs, delayMs);
            }

            this.logger.warn({
                msg: 'embedding.retrying',
                input,
                status: response.status,
                attempt,
                delayMs,
            });

            await this.sleep(delayMs);
        }

        throw new Error('Google Gemini Embedding API request failed after retries');
    }

    private parseRetryAfterMs(retryAfterHeader: string | null): number {
        if (!retryAfterHeader) {
            return 0;
        }

        const seconds = Number(retryAfterHeader);
        if (Number.isFinite(seconds) && seconds > 0) {
            return Math.round(seconds * 1000);
        }

        return 0;
    }

    private parseRetryInfoDelayMs(errorText: string): number {
        if (!errorText) {
            return 0;
        }

        const match = errorText.match(/"retryDelay"\s*:\s*"(\d+)s"/);
        if (!match) {
            return 0;
        }

        const seconds = Number(match[1]);
        if (!Number.isFinite(seconds) || seconds <= 0) {
            return 0;
        }

        return Math.round(seconds * 1000);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
