'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type EmbeddingItem = {
    id: string;
    name: string;
    description: string;
    category: string;
    embedding: number[];
};

type EmbeddingResponse = {
    count: number;
    items: EmbeddingItem[];
};

type PcaPoint = {
    x: number;
    y: number;
};

const COLOR_PALETTE = ['#0f766e', '#b45309', '#1d4ed8', '#b91c1c', '#7c3aed', '#0e7490', '#15803d', '#be185d'];

function normalize(values: number[]): number[] {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const value of values) {
        if (value < min) {
            min = value;
        }
        if (value > max) {
            max = value;
        }
    }

    const range = max - min;
    if (!Number.isFinite(range) || range === 0) {
        return values.map(() => 0.5);
    }

    return values.map((value) => (value - min) / range);
}

function dot(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) {
        sum += a[i] * b[i];
    }
    return sum;
}

function norm(vector: number[]): number {
    return Math.sqrt(dot(vector, vector));
}

function multiplyCovariance(centered: number[][], vector: number[]): number[] {
    const dimension = vector.length;
    const output = new Array<number>(dimension).fill(0);

    for (const row of centered) {
        const projection = dot(row, vector);
        for (let j = 0; j < dimension; j += 1) {
            output[j] += row[j] * projection;
        }
    }

    return output;
}

function powerIteration(centered: number[][], initial: number[], orthogonalTo?: number[]): number[] {
    let vector = initial;

    for (let iteration = 0; iteration < 30; iteration += 1) {
        let next = multiplyCovariance(centered, vector);

        if (orthogonalTo) {
            const projection = dot(next, orthogonalTo);
            next = next.map((value, index) => value - projection * orthogonalTo[index]);
        }

        const nextNorm = norm(next);
        if (!Number.isFinite(nextNorm) || nextNorm === 0) {
            break;
        }

        vector = next.map((value) => value / nextNorm);
    }

    return vector;
}

function pca2D(vectors: number[][]): PcaPoint[] {
    if (vectors.length === 0) {
        return [];
    }

    const dimension = vectors[0].length;
    if (dimension < 2) {
        return vectors.map(() => ({ x: 0.5, y: 0.5 }));
    }

    const mean = new Array<number>(dimension).fill(0);
    for (const vector of vectors) {
        for (let j = 0; j < dimension; j += 1) {
            mean[j] += vector[j];
        }
    }
    for (let j = 0; j < dimension; j += 1) {
        mean[j] /= vectors.length;
    }

    const centered = vectors.map((vector) => vector.map((value, index) => value - mean[index]));

    const seed1 = new Array<number>(dimension).fill(0).map((_, i) => (i % 2 === 0 ? 1 : 0.5));
    const component1 = powerIteration(centered, seed1);

    const seed2 = new Array<number>(dimension).fill(0).map((_, i) => (i % 3 === 0 ? 0.8 : 0.2));
    const component2 = powerIteration(centered, seed2, component1);

    const xRaw = centered.map((row) => dot(row, component1));
    const yRaw = centered.map((row) => dot(row, component2));

    const x = normalize(xRaw);
    const y = normalize(yRaw);

    return x.map((xValue, index) => ({ x: xValue, y: y[index] }));
}

export default function EmbeddingsPage() {
    const [allItems, setAllItems] = useState<EmbeddingItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sampleSize, setSampleSize] = useState(1200);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [dataSource, setDataSource] = useState<'search' | 'db'>('db');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadEmbeddings() {
            setLoading(true);
            setError(null);
            setSelectedIndex(null);

            const locationParams = new URLSearchParams(window.location.search);
            const idsParam = locationParams.get('ids') ?? '';

            const hasRequestedIds = idsParam.trim().length > 0;

            try {
                const filteredPath = hasRequestedIds
                    ? `/api/embeddings/map?ids=${encodeURIComponent(idsParam)}`
                    : '/api/embeddings/map';

                const response = await fetch(filteredPath, {
                    method: 'GET',
                    headers: {
                        'x-correlation-id': crypto.randomUUID(),
                    },
                });

                if (!response.ok) {
                    const body = await response.text();
                    throw new Error(body || 'Falha ao carregar embeddings.');
                }

                const payload = (await response.json()) as EmbeddingResponse;

                let nextItems = payload.items;
                let nextSource: 'search' | 'db' = hasRequestedIds ? 'search' : 'db';

                if (hasRequestedIds && nextItems.length === 0) {
                    const fallbackResponse = await fetch('/api/embeddings/map', {
                        method: 'GET',
                        headers: {
                            'x-correlation-id': crypto.randomUUID(),
                        },
                    });

                    if (!fallbackResponse.ok) {
                        const fallbackBody = await fallbackResponse.text();
                        throw new Error(fallbackBody || 'Falha ao carregar embeddings da base.');
                    }

                    const fallbackPayload = (await fallbackResponse.json()) as EmbeddingResponse;
                    nextItems = fallbackPayload.items;
                    nextSource = 'db';
                }

                if (!cancelled) {
                    setAllItems(nextItems);
                    setDataSource(nextSource);
                }
            } catch (err) {
                if (!cancelled) {
                    const message = err instanceof Error ? err.message : 'Erro inesperado ao carregar embeddings.';
                    setError(message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadEmbeddings();

        return () => {
            cancelled = true;
        };
    }, []);

    const categories = useMemo(() => {
        return [...new Set(allItems.map((item) => item.category))].sort((left, right) => left.localeCompare(right));
    }, [allItems]);

    const filteredItems = useMemo(() => {
        const source = selectedCategory === 'all'
            ? allItems
            : allItems.filter((item) => item.category === selectedCategory);

        return source.slice(0, sampleSize);
    }, [allItems, sampleSize, selectedCategory]);

    const coordinates = useMemo(() => {
        return pca2D(filteredItems.map((item) => item.embedding));
    }, [filteredItems]);

    const categoryColor = useMemo(() => {
        const mapping = new Map<string, string>();
        categories.forEach((category, index) => {
            mapping.set(category, COLOR_PALETTE[index % COLOR_PALETTE.length]);
        });
        return mapping;
    }, [categories]);

    const selectedItem = selectedIndex === null ? null : filteredItems[selectedIndex] ?? null;

    return (
        <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
            <section className="rounded-3xl bg-white/90 p-6 shadow-soft md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-sea">ai_rag analytics</p>
                        <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">Embedding Map (PCA 2D)</h1>
                        <p className="mt-2 text-sm text-slate-600 md:text-base">
                            Projecao em 2D dos vetores para inspecionar clusters por categoria e identificar outliers.
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Voltar ao console
                    </Link>
                </div>

                {error ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700">
                    Fonte dos dados: {dataSource === 'search' ? 'resultado da busca' : 'base completa (DB)'}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                Categoria
                                <select
                                    value={selectedCategory}
                                    onChange={(event) => {
                                        setSelectedCategory(event.target.value);
                                        setSelectedIndex(null);
                                    }}
                                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                                >
                                    <option value="all">Todas</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                Pontos
                                <input
                                    type="range"
                                    min={100}
                                    max={3000}
                                    step={100}
                                    value={sampleSize}
                                    onChange={(event) => {
                                        setSampleSize(Number(event.target.value));
                                        setSelectedIndex(null);
                                    }}
                                />
                                <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                                    {Math.min(sampleSize, selectedCategory === 'all'
                                        ? allItems.length
                                        : allItems.filter((item) => item.category === selectedCategory).length)}
                                </span>
                            </label>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            {loading ? (
                                <div className="grid h-[560px] place-items-center text-sm text-slate-500">Carregando embeddings...</div>
                            ) : filteredItems.length === 0 ? (
                                <div className="grid h-[560px] place-items-center text-sm text-slate-500">Sem pontos para exibir.</div>
                            ) : (
                                <svg viewBox="0 0 900 560" className="h-[560px] w-full">
                                    <rect x="0" y="0" width="900" height="560" fill="#f8fafc" />
                                    {coordinates.map((point, index) => {
                                        const item = filteredItems[index];
                                        const cx = 20 + point.x * 860;
                                        const cy = 20 + (1 - point.y) * 520;
                                        const color = categoryColor.get(item.category) ?? '#0f766e';
                                        const isSelected = selectedIndex === index;
                                        return (
                                            <circle
                                                key={item.id}
                                                cx={cx}
                                                cy={cy}
                                                r={isSelected ? 5 : 3}
                                                fill={color}
                                                fillOpacity={isSelected ? 1 : 0.75}
                                                stroke={isSelected ? '#0f172a' : 'none'}
                                                strokeWidth={isSelected ? 1.5 : 0}
                                                onClick={() => setSelectedIndex(index)}
                                            />
                                        );
                                    })}
                                </svg>
                            )}
                        </div>
                    </div>

                    <aside className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h2 className="text-lg font-semibold text-ink">Detalhes</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Total carregado: <span className="font-semibold text-slate-800">{allItems.length}</span>
                        </p>
                        <p className="text-sm text-slate-600">
                            Pontos visiveis: <span className="font-semibold text-slate-800">{filteredItems.length}</span>
                        </p>

                        <div className="mt-4 space-y-2">
                            {categories.map((category) => (
                                <div key={category} className="flex items-center gap-2 text-xs text-slate-700">
                                    <span
                                        className="inline-block h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: categoryColor.get(category) ?? '#0f766e' }}
                                    />
                                    <span className="truncate">{category}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                            {selectedItem ? (
                                <>
                                    <p className="font-semibold text-ink">{selectedItem.name}</p>
                                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{selectedItem.category}</p>
                                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{selectedItem.description}</p>
                                    <p className="mt-2 break-all text-[11px] text-slate-500">ID: {selectedItem.id}</p>
                                </>
                            ) : (
                                <p className="text-xs text-slate-500">Clique em um ponto para ver detalhes do produto.</p>
                            )}
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}
