'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { EmbeddingsControls } from './components/EmbeddingsControls';
import { EmbeddingsScatter } from './components/EmbeddingsScatter';
import { EmbeddingsSidebar } from './components/EmbeddingsSidebar';
import { buildCategoryColorMap, pca2D } from './projection';
import { EmbeddingItem, EmbeddingResponse } from './types';

export default function EmbeddingsPage() {
    const [allItems, setAllItems] = useState<EmbeddingItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sampleSize, setSampleSize] = useState(1200);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [dataSource, setDataSource] = useState<'search' | 'db'>('db');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const preventZoomWheel = (event: WheelEvent) => {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
            }
        };

        const preventGesture = (event: Event) => {
            event.preventDefault();
        };

        const preventZoomKeys = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey)) {
                return;
            }

            if (event.key === '+' || event.key === '-' || event.key === '=' || event.key === '0') {
                event.preventDefault();
            }
        };

        document.addEventListener('wheel', preventZoomWheel, { passive: false });
        document.addEventListener('gesturestart', preventGesture, { passive: false } as AddEventListenerOptions);
        document.addEventListener('gesturechange', preventGesture, { passive: false } as AddEventListenerOptions);
        document.addEventListener('gestureend', preventGesture, { passive: false } as AddEventListenerOptions);
        document.addEventListener('keydown', preventZoomKeys);

        return () => {
            document.removeEventListener('wheel', preventZoomWheel);
            document.removeEventListener('gesturestart', preventGesture as EventListener);
            document.removeEventListener('gesturechange', preventGesture as EventListener);
            document.removeEventListener('gestureend', preventGesture as EventListener);
            document.removeEventListener('keydown', preventZoomKeys);
        };
    }, []);

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

    const currentCount = useMemo(() => {
        const sourceCount = selectedCategory === 'all'
            ? allItems.length
            : allItems.filter((item) => item.category === selectedCategory).length;

        return Math.min(sampleSize, sourceCount);
    }, [allItems, sampleSize, selectedCategory]);

    const coordinates = useMemo(() => {
        return pca2D(filteredItems.map((item) => item.embedding));
    }, [filteredItems]);

    const categoryColor = useMemo(() => {
        return buildCategoryColorMap(categories);
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

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <EmbeddingsControls
                            categories={categories}
                            selectedCategory={selectedCategory}
                            onSelectedCategoryChange={(value) => {
                                setSelectedCategory(value);
                                setSelectedIndex(null);
                            }}
                            sampleSize={sampleSize}
                            onSampleSizeChange={(value) => {
                                setSampleSize(value);
                                setSelectedIndex(null);
                            }}
                            currentCount={currentCount}
                        />

                        <EmbeddingsScatter
                            loading={loading}
                            filteredItems={filteredItems}
                            coordinates={coordinates}
                            selectedIndex={selectedIndex}
                            onSelectIndex={setSelectedIndex}
                            categoryColor={categoryColor}
                        />
                    </div>

                    <EmbeddingsSidebar
                        allCount={allItems.length}
                        visibleCount={filteredItems.length}
                        dataSource={dataSource}
                        categories={categories}
                        categoryColor={categoryColor}
                        selectedItem={selectedItem}
                    />
                </div>
            </section>
        </main>
    );
}
