import { HybridSearchResult } from 'src/domain/interfaces/search-repository.interface';

export type StepId = 'embedding' | 'vector_search' | 'rerank';

export type StepEvent = {
    type: 'step';
    step: StepId;
    status: 'started' | 'completed' | 'skipped' | 'error';
    durationMs?: number;
    meta?: Record<string, unknown>;
};

export type OnStep = (event: StepEvent) => void;

export interface SearchStep<TInput, TResult> {
    execute(input: TInput, onStep?: OnStep): Promise<TResult>;
}
