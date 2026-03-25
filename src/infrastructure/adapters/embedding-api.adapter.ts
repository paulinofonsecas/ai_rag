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

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.getOrThrow<string>('embedding.apiKey');
        this.model = this.configService.get<string>('embedding.model', 'gemini-embedding-001');
        this.dimensions = this.configService.get<number>('embedding.dimensions', 1536);
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

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`;

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
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.text();
                this.logger.error(`Google Gemini API error: ${response.status} - ${errorData}`);
                throw new Error(
                    `Google Gemini Embedding API request failed with status ${response.status}`,
                );
            }

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
}
