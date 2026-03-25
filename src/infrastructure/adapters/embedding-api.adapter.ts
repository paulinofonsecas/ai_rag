import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmbeddingService } from 'src/domain/interfaces/embedding-service.interface';

type OpenAIEmbeddingResponse = {
  data: Array<{ embedding: number[] }>;
};

@Injectable()
export class EmbeddingAPIAdapter implements EmbeddingService {
  private readonly cache = new Map<string, number[]>();
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('embedding.apiKey');
    this.model = this.configService.get<string>('embedding.model', 'text-embedding-3-small');
    this.baseUrl = this.configService.get<string>('embedding.baseUrl', 'https://api.openai.com/v1');
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

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: normalized,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as OpenAIEmbeddingResponse;
    const vector = payload.data[0]?.embedding;
    if (!vector) {
      throw new Error('Embedding API returned an empty embedding payload');
    }

    this.cache.set(normalized, vector);
    return vector;
  }

  private normalize(input: string) {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
