'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

type StepId = 'embedding' | 'vector_search' | 'rerank';

type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';

type StepState = {
    id: StepId;
    label: string;
    status: StepStatus;
    durationMs?: number;
};

type SseStepEvent = {
    type: 'step';
    step: StepId;
    status: 'started' | 'completed' | 'skipped' | 'error';
    durationMs?: number;
};

type SseDoneEvent = {
    type: 'done';
    query: string;
    count: number;
    items: unknown[];
};

type SseErrorEvent = {
    type: 'error';
    message: string;
};

type SseEvent = SseStepEvent | SseDoneEvent | SseErrorEvent;

export type SearchResult = {
    query: string;
    count: number;
    items: unknown[];
};

type LastRunSummary = {
    query: string;
    count: number;
    totalMs: number;
    steps: StepState[];
};

// ── Config ─────────────────────────────────────────────────────────────────────

const INITIAL_STEPS: StepState[] = [
    { id: 'embedding', label: 'Gerando vetor da query', status: 'pending' },
    { id: 'vector_search', label: 'Busca semântica (pgvector)', status: 'pending' },
    { id: 'rerank', label: 'Reranking com Gemini AI', status: 'pending' },
];

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
    searchParams: URLSearchParams;
    submitSignal?: number;
    onComplete: (result: SearchResult) => void;
    onError: (message: string) => void;
    disabled?: boolean;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SearchProgressButton({ searchParams, submitSignal, onComplete, onError, disabled }: Props) {
    const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
    const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
    const [totalMs, setTotalMs] = useState<number>(0);
    const [lastRun, setLastRun] = useState<LastRunSummary | null>(null);

    const startedAtRef = useRef<number>(0);
    const esRef = useRef<EventSource | null>(null);
    const stepsRef = useRef<StepState[]>(INITIAL_STEPS.map((step) => ({ ...step })));

    function updateStep(id: StepId, patch: Partial<StepState>) {
        setSteps((prev) => {
            const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
            stepsRef.current = next;
            return next;
        });
    }

    const startSearch = useCallback(() => {
        if (phase === 'running' || disabled) return;

        esRef.current?.close();

        const resetSteps = INITIAL_STEPS.map((s) => ({ ...s }));
        setSteps(resetSteps);
        stepsRef.current = resetSteps;
        setPhase('running');
        startedAtRef.current = Date.now();

        const es = new EventSource(`/api/search/stream?${searchParams.toString()}`);
        esRef.current = es;

        es.onmessage = (event: MessageEvent<string>) => {
            let data: SseEvent;

            try {
                data = JSON.parse(event.data) as SseEvent;
            } catch {
                return;
            }

            if (data.type === 'step') {
                if (data.status === 'started') {
                    updateStep(data.step, { status: 'running' });
                } else if (data.status === 'completed') {
                    updateStep(data.step, { status: 'done', durationMs: data.durationMs });
                } else if (data.status === 'skipped') {
                    updateStep(data.step, { status: 'skipped' });
                } else if (data.status === 'error') {
                    updateStep(data.step, { status: 'error' });
                }
            } else if (data.type === 'done') {
                const elapsed = Date.now() - startedAtRef.current;
                setTotalMs(elapsed);
                setLastRun({
                    query: data.query,
                    count: data.count,
                    totalMs: elapsed,
                    steps: stepsRef.current.map((step) => ({ ...step })),
                });
                setPhase('done');
                es.close();

                setTimeout(() => {
                    setPhase('idle');
                    onComplete(data as SearchResult);
                }, 900);
            } else if (data.type === 'error') {
                setPhase('idle');
                es.close();
                onError((data as SseErrorEvent).message ?? 'Erro desconhecido na busca.');
            }
        };

        es.onerror = () => {
            setPhase('idle');
            es.close();
            onError('Falha na conexão com o servidor de busca.');
        };
    }, [disabled, onComplete, onError, phase, searchParams]);

    useEffect(() => {
        if (!submitSignal) {
            return;
        }

        startSearch();
    }, [submitSignal, startSearch]);

    // ── Idle state ─────────────────────────────────────────────────────────────
    if (phase === 'idle') {
        return (
            <div className="md:col-span-2 flex flex-col gap-3">
                <button
                    type="button"
                    onClick={startSearch}
                    disabled={disabled}
                    className="rounded-xl bg-sea px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Buscar
                </button>

                {lastRun ? (
                    <div className="rounded-xl border border-slate-200 bg-white/80 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                            <span className="text-sm font-semibold text-ink">Resumo da ultima busca</span>
                            <span className="text-xs text-slate-500 tabular-nums">
                                {(lastRun.totalMs / 1000).toFixed(2)}s
                            </span>
                        </div>

                        <div className="px-4 py-2 text-sm text-slate-700 border-b border-slate-100">
                            <span className="font-medium text-ink">Query:</span> {lastRun.query}
                            <span className="ml-3 inline-flex rounded-full bg-sea/10 px-2 py-0.5 text-xs font-semibold text-sea">
                                {lastRun.count} itens
                            </span>
                        </div>

                        <ul className="divide-y divide-slate-100">
                            {lastRun.steps.map((step) => (
                                <li key={step.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <StepIcon status={step.status} />
                                        <span className="text-sm text-slate-700 truncate">{step.label}</span>
                                    </div>
                                    <StepDuration step={step} />
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </div>
        );
    }

    // ── Done state ─────────────────────────────────────────────────────────────
    if (phase === 'done') {
        return (
            <div className="md:col-span-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 flex items-center justify-center gap-2">
                <CheckIcon />
                Busca concluída em {(totalMs / 1000).toFixed(2)}s
            </div>
        );
    }

    // ── Running state ──────────────────────────────────────────────────────────
    return (
        <div className="md:col-span-2 rounded-xl border border-sea/20 bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-sea/5 border-b border-sea/10">
                <div className="flex items-center gap-2">
                    <SpinnerIcon className="text-sea" />
                    <span className="text-sm font-semibold text-sea">Processando busca…</span>
                </div>
                <Elapsed startedAt={startedAtRef.current} />
            </div>

            {/* Steps */}
            <ul className="divide-y divide-slate-100">
                {steps.map((step) => (
                    <li key={step.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <StepIcon status={step.status} />
                            <span
                                className={[
                                    'text-sm truncate',
                                    step.status === 'running'
                                        ? 'font-semibold text-ink'
                                        : step.status === 'done'
                                            ? 'text-slate-700'
                                            : step.status === 'skipped'
                                                ? 'text-slate-400 line-through'
                                                : step.status === 'error'
                                                    ? 'text-red-600'
                                                    : 'text-slate-400',
                                ].join(' ')}
                            >
                                {step.label}
                            </span>
                        </div>
                        <StepDuration step={step} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepIcon({ status }: { status: StepStatus }) {
    if (status === 'running') return <SpinnerIcon className="text-sea shrink-0" />;
    if (status === 'done') return <CheckIcon className="text-emerald-500 shrink-0" />;
    if (status === 'skipped') return <SkipIcon className="text-slate-300 shrink-0" />;
    if (status === 'error') return <ErrorIcon className="text-red-500 shrink-0" />;
    return <PendingDot />;
}

function StepDuration({ step }: { step: StepState }) {
    if (step.status === 'running') {
        return <span className="text-xs text-slate-400 shrink-0 tabular-nums">…</span>;
    }
    if (step.status === 'done' && step.durationMs !== undefined) {
        return (
            <span className="text-xs text-slate-500 shrink-0 tabular-nums">{step.durationMs}ms</span>
        );
    }
    if (step.status === 'skipped') {
        return <span className="text-xs text-slate-300 shrink-0">—</span>;
    }
    return null;
}

function Elapsed({ startedAt }: { startedAt: number }) {
    const [, setTick] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 100);
        return () => clearInterval(id);
    }, []);

    const ms = Date.now() - startedAt;
    const label = ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

    return <span className="text-xs text-sea/70 tabular-nums font-medium">{label}</span>;
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function SpinnerIcon({ className = '' }: { className?: string }) {
    return (
        <svg
            className={`h-4 w-4 animate-spin ${className}`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
        </svg>
    );
}

function CheckIcon({ className = '' }: { className?: string }) {
    return (
        <svg className={`h-4 w-4 ${className}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
            />
        </svg>
    );
}

function SkipIcon({ className = '' }: { className?: string }) {
    return (
        <svg className={`h-4 w-4 ${className}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
    );
}

function ErrorIcon({ className = '' }: { className?: string }) {
    return (
        <svg className={`h-4 w-4 ${className}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
            />
        </svg>
    );
}

function PendingDot() {
    return <span className="h-4 w-4 shrink-0 flex items-center justify-center" aria-hidden="true">
        <span className="block h-1.5 w-1.5 rounded-full bg-slate-300" />
    </span>;
}
