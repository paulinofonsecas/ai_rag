import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ResultReranker } from 'src/domain/interfaces/reranker.interface';
import { HybridSearchResult } from 'src/domain/interfaces/search-repository.interface';

type GeminiGenerateContentResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
};

@Injectable()
export class GeminiRerankerAdapter implements ResultReranker {
    private readonly logger = new Logger(GeminiRerankerAdapter.name);
    private readonly apiKey: string;
    private readonly model: string;
    private readonly maxCandidates: number;
    private readonly maxRetries: number;
    private readonly backoffMs: number;
    private readonly cooldownMs: number;
    private readonly cacheTtlMs: number;
    private readonly cache = new Map<string, { orderedIds: string[]; expiresAt: number }>();
    private rateLimitedUntil = 0;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.getOrThrow<string>('embedding.apiKey');
        this.model = this.configService.get<string>('reranker.model', 'gemini-2.5-flash');
        this.maxCandidates = this.configService.get<number>('reranker.maxCandidates', 40);
        this.maxRetries = this.configService.get<number>('reranker.maxRetries', 2);
        this.backoffMs = this.configService.get<number>('reranker.backoffMs', 400);
        this.cooldownMs = this.configService.get<number>('reranker.cooldownMs', 10_000);
        this.cacheTtlMs = this.configService.get<number>('reranker.cacheTtlMs', 30_000);
    }

    async rerank(query: string, candidates: HybridSearchResult[]): Promise<string[]> {
        if (candidates.length === 0) {
            return [];
        }

        this.logger.log({
            msg: 'gemini-reranker.started',
            query,
            inputCandidates: candidates.length,
            model: this.model,
        });

        if (Date.now() < this.rateLimitedUntil) {
            this.logger.warn({
                msg: 'gemini-reranker.cooldown_active',
                cooldownMsRemaining: this.rateLimitedUntil - Date.now(),
            });
            return [];
        }

        const truncatedCandidates = candidates.slice(0, this.maxCandidates).map((item, index) => ({
            id: item.product.id,
            index: index + 1,
            name: item.product.name,
            category: item.product.category,
            description: item.product.description,
        }));

        const cacheKey = this.buildCacheKey(query, truncatedCandidates.map((item) => item.id));
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            this.logger.log({
                msg: 'gemini-reranker.cache_hit',
                query,
                candidateCount: truncatedCandidates.length,
            });
            return cached.orderedIds;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
        const prompt = [
            'You are a strict ranking engine for e-commerce search.',
            'Task: reorder product IDs by relevance to the user query.',
            'Rules:',
            '- Return JSON only.',
            '- Output format: {"orderedIds": ["id1", "id2", "id3"]}.',
            '- Every ID must be returned literally and completely.',
            '- Never abbreviate an ID.',
            '- Never use ellipsis (...).',
            '- Never shorten, summarize, or partially print any ID.',
            '- Never include explanations, comments, or markdown fences.',
            '- Include only IDs from the candidate list.',
            '- Do not invent IDs.',
            '- Rank by intent match, specificity, and semantic alignment.',
            `Query: ${query}`,
            `Candidates: ${JSON.stringify(truncatedCandidates)}`,
        ].join('\n');

        const body = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: prompt,
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0,
                topK: 1,
                topP: 0.1,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        orderedIds: {
                            type: 'ARRAY',
                            items: {
                                type: 'STRING',
                            },
                        },
                    },
                    required: ['orderedIds'],
                },
            },
        };

        const response = await this.sendWithRetry(url, body, query);

        const payload = (await response.json()) as GeminiGenerateContentResponse;
        const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';

        const allowedIds = new Set(truncatedCandidates.map((item) => item.id));
        const orderedIds = this.parseOrderedIds(text, allowedIds);
        const sanitized = orderedIds.filter((id) => allowedIds.has(id));

        if (sanitized.length === 0) {
            this.logger.warn({
                msg: 'gemini-reranker.empty_output',
                query,
                candidateCount: truncatedCandidates.length,
            });
        }

        this.cache.set(cacheKey, {
            orderedIds: sanitized,
            expiresAt: Date.now() + this.cacheTtlMs,
        });

        this.logger.log({
            msg: 'gemini-reranker.completed',
            query,
            candidateCount: truncatedCandidates.length,
            orderedCount: sanitized.length,
        });

        return sanitized;
    }

    private async sendWithRetry(url: string, body: object, query: string): Promise<Response> {
        for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
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
                throw new Error(`Gemini rerank request failed: ${response.status} ${errorText}`);
            }

            const retryAfterMs = this.parseRetryAfterMs(response.headers.get('retry-after'));
            const retryInfoMs = this.parseRetryInfoDelayMs(errorText);
            const backoffWithJitter = Math.round(this.backoffMs * 2 ** attempt + Math.random() * this.backoffMs);
            const delayMs = Math.max(retryAfterMs, retryInfoMs, backoffWithJitter);

            if (response.status === 429) {
                this.rateLimitedUntil = Date.now() + Math.max(this.cooldownMs, delayMs);
            }

            this.logger.warn({
                msg: 'gemini-reranker.retrying',
                query,
                status: response.status,
                attempt,
                delayMs,
            });

            await this.sleep(delayMs);
        }

        throw new Error('Gemini rerank request failed after retries');
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

    private buildCacheKey(query: string, candidateIds: string[]): string {
        return `${query.trim().toLowerCase()}::${candidateIds.join(',')}`;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private parseOrderedIds(text: string, allowedIds: Set<string>): string[] {
        let raw = text.trim();
        if (!raw) {
            return [];
        }

        if (raw.startsWith('```json')) {
            raw = raw.slice(7);
        } else if (raw.startsWith('```')) {
            raw = raw.slice(3);
        }
        if (raw.endsWith('```')) {
            raw = raw.slice(0, -3);
        }
        raw = raw.trim();

        if (raw.includes('...')) {
            this.logger.warn({
                msg: 'gemini-reranker.literal_output_violation',
                error: 'response_contains_ellipsis',
                rawLength: raw.length,
            });
        }

        try {
            const parsed = JSON.parse(raw) as { orderedIds?: unknown } | unknown[];

            if (Array.isArray(parsed)) {
                return parsed.filter((item): item is string => typeof item === 'string');
            }

            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.orderedIds)) {
                return parsed.orderedIds.filter((item): item is string => typeof item === 'string');
            }

            return [];
        } catch (error) {
            const recoveredIds = this.extractLiteralIds(raw, allowedIds);

            this.logger.warn({
                msg: 'gemini-reranker.parse_failed',
                error: error instanceof Error ? error.message : 'unknown_error',
                rawLength: raw.length,
                rawSubstring: raw.slice(0, 100) + '...' + raw.slice(-100),
                recoveredCount: recoveredIds.length,
            });

            return recoveredIds;
        }
    }

    private extractLiteralIds(raw: string, allowedIds: Set<string>): string[] {
        const recoveredIds: string[] = [];
        const used = new Set<string>();

        for (const id of allowedIds) {
            if (raw.includes(id) && !used.has(id)) {
                used.add(id);
                recoveredIds.push(id);
            }
        }

        return recoveredIds.sort((left, right) => raw.indexOf(left) - raw.indexOf(right));
    }
}
