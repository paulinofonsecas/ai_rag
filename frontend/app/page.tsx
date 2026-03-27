'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';

import SearchProgressButton, { SearchResult } from './components/SearchProgressButton';

type CreatedProduct = {
    id: string;
    name: string;
    description: string;
    category: string;
    createdAt: string;
    updatedAt: string;
    status: string;
};

type SearchItem = {
    id: string;
    name: string;
    description: string;
    category: string;
    scores: {
        rrf: number;
        semantic: number | null;
        lexical: number | null;
    };
    ranks: {
        semantic: number | null;
        lexical: number | null;
    };
};

type SearchResponse = {
    query: string;
    count: number;
    items: SearchItem[];
};

function formatMaybeNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return '-';
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(4);
}

export default function HomePage() {
    const [ingestForm, setIngestForm] = useState({
        name: '',
        description: '',
        category: '',
    });
    const [createdProduct, setCreatedProduct] = useState<CreatedProduct | null>(null);
    const [ingestBusy, setIngestBusy] = useState(false);

    const [query, setQuery] = useState('');
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [rrfK, setRrfK] = useState(60);
    const [rerank, setRerank] = useState(true);
    const [rerankCandidates, setRerankCandidates] = useState(30);
    const [searchSubmitSignal, setSearchSubmitSignal] = useState(0);

    const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [exportBusy, setExportBusy] = useState(false);

    const hasSearchData = useMemo(() => (searchResult?.items?.length ?? 0) > 0, [searchResult]);
    const searchParams = useMemo(
        () =>
            new URLSearchParams({
                q: query,
                limit: String(limit),
                offset: String(offset),
                rrfK: String(rrfK),
                rerank: String(rerank),
                rerankCandidates: String(rerankCandidates),
            }),
        [query, limit, offset, rrfK, rerank, rerankCandidates],
    );
    const embeddingsMapHref = useMemo(() => {
        const ids = searchResult?.items?.map((item) => item.id) ?? [];

        if (ids.length === 0) {
            return '/embeddings';
        }

        const params = new URLSearchParams();
        params.set('ids', ids.join(','));
        params.set('source', 'search');
        return `/embeddings?${params.toString()}`;
    }, [searchResult]);

    async function submitIngest(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage(null);
        setCreatedProduct(null);
        setIngestBusy(true);

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-correlation-id': crypto.randomUUID(),
                },
                body: JSON.stringify(ingestForm),
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(body || 'Falha ao criar produto.');
            }

            const data = (await response.json()) as CreatedProduct;
            setCreatedProduct(data);
            setIngestForm({ name: '', description: '', category: '' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro inesperado na ingestao.';
            setErrorMessage(message);
        } finally {
            setIngestBusy(false);
        }
    }

    async function exportEmbeddings() {
        setErrorMessage(null);
        setExportBusy(true);

        try {
            const response = await fetch('/api/embeddings', {
                method: 'GET',
                headers: {
                    'x-correlation-id': crypto.randomUUID(),
                },
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(body || 'Falha ao exportar embeddings.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
                : `embeddings-${Date.now()}.tsv`;

            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro inesperado ao exportar.';
            setErrorMessage(message);
        } finally {
            setExportBusy(false);
        }
    }

    function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (query.trim().length < 2) {
            return;
        }

        setSearchSubmitSignal((current) => current + 1);
    }

    return (
        <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
            {errorMessage ? (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">

                {/* ── COLUNA ESQUERDA ── */}
                <div className="flex flex-col gap-6">

                    {/* Informações com destaque de IA */}
                    <section className="rounded-3xl bg-white/85 p-6 shadow-soft backdrop-blur-md md:p-8">
                        <p className="text-sm uppercase tracking-[0.2em] text-sea">ai_rag interface</p>
                        <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">Hybrid Search Console</h1>
                        <p className="mt-3 text-sm text-slate-600 md:text-base">
                            Pipeline de busca híbrida com embeddings semânticos, FTS lexical e fusão RRF.
                            O reranking é realizado pelo modelo <span className="font-semibold text-sea">Gemini</span> para
                            máxima relevância contextual.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-sea/10 px-3 py-1 text-xs font-semibold text-sea">
                                ✦ Embeddings semânticos
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-sea/10 px-3 py-1 text-xs font-semibold text-sea">
                                ✦ Reranking com Gemini AI
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-3 py-1 text-xs font-semibold text-coral">
                                ✦ pgvector + FTS híbrido
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-3 py-1 text-xs font-semibold text-coral">
                                ✦ Reciprocal Rank Fusion
                            </span>
                        </div>
                    </section>

                    {/* Busca Híbrida */}
                    <article className="rounded-3xl bg-mist p-5 shadow-soft md:p-6">
                        <h2 className="text-xl font-semibold text-ink">Busca Híbrida</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Digite o que voce procura.
                        </p>
                        <form onSubmit={handleSearchSubmit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-700">
                                O que voce quer encontrar?
                                <input
                                    required
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-base outline-none ring-sea/30 transition focus:ring"
                                    placeholder="Preciso de um cafe premium para acompanhar meu bolo de chocolate"
                                />
                            </label>

                            <details className="md:col-span-2 rounded-xl border border-slate-200 bg-white/70 p-3">
                                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                                    Configuracoes avancadas (opcional)
                                </summary>

                                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                                        Quantidade de resultados
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={limit}
                                            onChange={(event) => setLimit(Number(event.target.value))}
                                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sea/30 transition focus:ring"
                                        />
                                    </label>

                                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                                        Pular resultados (offset)
                                        <input
                                            type="number"
                                            min={0}
                                            value={offset}
                                            onChange={(event) => setOffset(Number(event.target.value))}
                                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sea/30 transition focus:ring"
                                        />
                                    </label>

                                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                                        Equilibrio RRF (padrao 60)
                                        <input
                                            type="number"
                                            min={1}
                                            value={rrfK}
                                            onChange={(event) => setRrfK(Number(event.target.value))}
                                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sea/30 transition focus:ring"
                                        />
                                    </label>

                                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                                        Itens para refinamento da IA
                                        <input
                                            type="number"
                                            min={1}
                                            value={rerankCandidates}
                                            onChange={(event) => setRerankCandidates(Number(event.target.value))}
                                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sea/30 transition focus:ring"
                                        />
                                    </label>

                                    <label className="md:col-span-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={rerank}
                                            onChange={(event) => setRerank(event.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-sea focus:ring-sea"
                                        />
                                        Usar IA para refinar a ordem dos resultados
                                    </label>
                                </div>
                            </details>

                            <SearchProgressButton
                                searchParams={searchParams}
                                submitSignal={searchSubmitSignal}
                                onComplete={(result: SearchResult) => {
                                    setErrorMessage(null);
                                    setSearchResult(result as unknown as SearchResponse);
                                }}
                                onError={(message: string) => setErrorMessage(message)}
                                disabled={query.trim().length < 2}
                            />
                        </form>
                    </article>

                    {/* Cadastro de Produto */}
                    {/* <article className="rounded-3xl bg-sand p-5 shadow-soft md:p-6">
                        <h2 className="text-xl font-semibold text-ink">Cadastro de Produto</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            O produto é enfileirado para geração de embedding via pipeline assíncrono.
                        </p>
                        <form onSubmit={submitIngest} className="mt-4 flex flex-col gap-3">
                            <input
                                required
                                value={ingestForm.name}
                                onChange={(event) => setIngestForm((prev) => ({ ...prev, name: event.target.value }))}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sea/30 transition focus:ring"
                                placeholder="Nome do produto"
                            />
                            <textarea
                                required
                                value={ingestForm.description}
                                onChange={(event) =>
                                    setIngestForm((prev) => ({ ...prev, description: event.target.value }))
                                }
                                className="min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sea/30 transition focus:ring"
                                placeholder="Descrição do produto"
                            />
                            <input
                                required
                                value={ingestForm.category}
                                onChange={(event) =>
                                    setIngestForm((prev) => ({ ...prev, category: event.target.value }))
                                }
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sea/30 transition focus:ring"
                                placeholder="Categoria"
                            />
                            <button
                                type="submit"
                                disabled={ingestBusy}
                                className="mt-1 rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {ingestBusy ? 'Enviando...' : 'Criar produto'}
                            </button>
                        </form>

                        {createdProduct ? (
                            <div className="mt-4 rounded-xl bg-white/80 p-3 text-sm text-slate-700">
                                <p className="font-semibold text-ink">Produto enviado para pipeline de embedding.</p>
                                <p className="mt-1 break-all">ID: {createdProduct.id}</p>
                                <p>Status: {createdProduct.status}</p>
                            </div>
                        ) : null}

                    </article> */}
                </div>

                {/* ── COLUNA DIREITA — Resultados ── */}
                <div className="lg:sticky lg:top-8">
                    <section className="rounded-3xl bg-white/85 p-5 shadow-soft md:p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-ink">Resultados</h2>
                            <div className="flex items-center gap-2">
                                {hasSearchData ? (
                                    <span className="rounded-full bg-sea/10 px-3 py-1 text-xs font-semibold text-sea">
                                        {searchResult?.count ?? 0} itens
                                    </span>
                                ) : null}
                                <Link
                                    href={embeddingsMapHref}
                                    className="rounded-xl border border-sea/30 bg-sea/10 px-3 py-1 text-xs font-semibold text-sea transition hover:bg-sea/15"
                                >
                                    Visualizar Mapa
                                </Link>
                            </div>
                        </div>

                        {!hasSearchData ? (
                            <p className="mt-3 text-sm text-slate-500">
                                Execute uma busca para visualizar ranking, scores e metadados.
                            </p>
                        ) : (
                            <div className="mt-4 max-h-[calc(100vh-10rem)] overflow-y-auto space-y-3 pr-1">
                                {searchResult?.items.map((item, index) => (
                                    <article
                                        key={item.id}
                                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h3 className="text-sm font-semibold text-ink">
                                                {index + 1}. {item.name}
                                            </h3>
                                            <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-sea">
                                                {item.category}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.description}</p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                                            <span className="rounded-lg bg-slate-50 px-2 py-1">
                                                RRF: {formatMaybeNumber(item.scores.rrf)}
                                            </span>
                                            <span className="rounded-lg bg-slate-50 px-2 py-1">
                                                Semântico: {formatMaybeNumber(item.scores.semantic)}
                                            </span>
                                            <span className="rounded-lg bg-slate-50 px-2 py-1">
                                                Lexical: {formatMaybeNumber(item.scores.lexical)}
                                            </span>
                                            <span className="rounded-lg bg-slate-50 px-2 py-1 break-all">
                                                ID: {item.id}
                                            </span>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}
