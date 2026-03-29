'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

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
    imageUrl: string | null;
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

type IngestionStatus = 'queued' | 'processing' | 'completed' | 'failed';

type IngestionStatusEvent = {
    type: 'status';
    productId: string;
    status: IngestionStatus;
    at: string;
    message?: string;
};

function formatMaybeNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return '-';
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(4);
}

function getCategoryBadgeStyle(category: string) {
    let hash = 0;

    for (let index = 0; index < category.length; index += 1) {
        hash = category.charCodeAt(index) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;

    return {
        backgroundColor: `hsla(${hue}, 85%, 92%, 0.95)`,
        color: `hsl(${hue}, 55%, 28%)`,
        borderColor: `hsla(${hue}, 70%, 55%, 0.35)`,
    };
}

function ProductImage({
    imageUrl,
    name,
    className,
}: {
    imageUrl: string | null;
    name: string;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const hasImage = Boolean(imageUrl) && !failed;

    useEffect(() => {
        setFailed(false);
        setLoaded(false);
    }, [imageUrl]);

    return (
        <div className={`relative bg-slate-100 overflow-hidden ${className ?? 'h-40'}`}>
            {hasImage && !loaded ? (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
            ) : null}

            {hasImage ? (
                <img
                    src={imageUrl ?? ''}
                    alt={name}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-500">
                    Sem imagem disponivel
                </div>
            )}
        </div>
    );
}

export default function HomePage() {
    const [ingestForm, setIngestForm] = useState({
        name: '',
        description: '',
        category: '',
    });
    const [createdProduct, setCreatedProduct] = useState<CreatedProduct | null>(null);
    const [ingestBusy, setIngestBusy] = useState(false);
    const [ingestionStatus, setIngestionStatus] = useState<IngestionStatusEvent | null>(null);

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
            setIngestionStatus({
                type: 'status',
                productId: data.id,
                status: 'queued',
                at: new Date().toISOString(),
                message: 'Produto enfileirado para gerar embedding.',
            });
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

    function handleClearQuery() {
        setQuery('');
        setSearchResult(null);
        setErrorMessage(null);
    }

    useEffect(() => {
        if (!createdProduct?.id) {
            return;
        }

        const stream = new EventSource(`/api/products/${createdProduct.id}/stream`);

        stream.onmessage = (event: MessageEvent<string>) => {
            try {
                const data = JSON.parse(event.data) as IngestionStatusEvent;
                if (data.type === 'status') {
                    setIngestionStatus(data);
                    if (data.status === 'completed' || data.status === 'failed') {
                        stream.close();
                    }
                }
            } catch {
                // Ignore malformed SSE payloads.
            }
        };

        stream.onerror = () => {
            stream.close();
        };

        return () => {
            stream.close();
        };
    }, [createdProduct?.id]);

    const ingestStatusStyle = useMemo(() => {
        const status = ingestionStatus?.status;
        if (status === 'completed') {
            return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        }
        if (status === 'failed') {
            return 'border-red-200 bg-red-50 text-red-700';
        }
        if (status === 'processing') {
            return 'border-amber-200 bg-amber-50 text-amber-800';
        }
        return 'border-sky-200 bg-sky-50 text-sky-700';
    }, [ingestionStatus?.status]);

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
                        <div className="mt-5 flex flex-wrap gap-3">
                            <Link
                                href="/docs"
                                className="inline-flex items-center justify-center rounded-2xl border border-sea/20 bg-sea px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:brightness-105"
                            >
                                Abrir documentacao tecnica
                            </Link>
                            <Link
                                href="/docs/pt-br"
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
                            >
                                Ver indice PT-BR
                            </Link>
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
                                <div className="flex items-center gap-2">
                                    <input
                                        required
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base outline-none ring-sea/30 transition focus:ring"
                                        placeholder="Preciso de um cafe premium para acompanhar meu bolo de chocolate"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleClearQuery}
                                        disabled={query.length === 0 && !searchResult && !errorMessage}
                                        className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Limpar
                                    </button>
                                </div>
                            </label>

                            <details className="md:col-span-2 rounded-xl border border-slate-200 bg-white/70 p-3">
                                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                                    Configuracoes avancadas  (opcional)
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
                    <article className="rounded-3xl bg-sand p-5 shadow-soft md:p-6">
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
                                {ingestionStatus ? (
                                    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${ingestStatusStyle}`}>
                                        <p>
                                            Estado: <span className="font-semibold uppercase">{ingestionStatus.status}</span>
                                        </p>
                                        <p className="mt-1">{ingestionStatus.message ?? 'Aguardando atualizações...'}</p>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                    </article>
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
                                    (() => {
                                        const categoryBadgeStyle = getCategoryBadgeStyle(item.category);

                                        return (
                                            <article
                                                key={item.id}
                                                className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow flex items-start"
                                            >
                                                {/* Imagem do Produto */}
                                                <div className="relative w-[30%] min-w-[120px] border-r border-slate-100 shrink-0">
                                                    <ProductImage
                                                        imageUrl={item.imageUrl}
                                                        name={item.name}
                                                        className="h-[180px] md:h-[220px]"
                                                    />
                                                    <div className="absolute top-2 left-2 bg-sea/90 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                                                        #{index + 1}
                                                    </div>
                                                </div>

                                                {/* Conteúdo */}
                                                <div className="p-4 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <h3 className="text-sm font-semibold text-ink line-clamp-2">
                                                            {item.name}
                                                        </h3>
                                                        <span
                                                            className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none"
                                                            style={categoryBadgeStyle}
                                                        >
                                                            {item.category}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-xs text-slate-600 line-clamp-3">
                                                        {item.description}
                                                    </p>

                                                    {/* Scores */}
                                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            <span className="inline-flex items-center gap-1 rounded-lg bg-sea/10 px-2 py-1 text-xs text-sea font-medium">
                                                                RRF: {formatMaybeNumber(item.scores.rrf)}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-900 font-medium">
                                                                Sem: {formatMaybeNumber(item.scores.semantic)}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs text-emerald-900 font-medium">
                                                                Lex: {formatMaybeNumber(item.scores.lexical)}
                                                            </span>
                                                        </div>
                                                        <p className="mt-2 text-xs text-slate-500 break-all font-mono">
                                                            ID: {item.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })()
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}
