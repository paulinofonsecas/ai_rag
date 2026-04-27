'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import SearchProgressButton, { SearchResult } from './components/SearchProgressButton';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Separator } from './components/ui/separator';
import { Textarea } from './components/ui/textarea';

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
        <div className={`relative bg-muted overflow-hidden ${className ?? 'h-40'}`}>
            {hasImage && !loaded ? (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
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
                <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
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
    const [limit, setLimit] = useState(50);
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
                <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {errorMessage}
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">

                {/* ── COLUNA ESQUERDA ── */}
                <div className="flex flex-col gap-6">

                    {/* Hero card */}
                    <Card>
                        <CardHeader className="pb-4">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                ai_rag interface
                            </p>
                            <CardTitle className="mt-1 text-3xl md:text-4xl">Hybrid Search Console</CardTitle>
                            <CardDescription className="mt-2 text-sm md:text-base">
                                Pipeline de busca híbrida com embeddings semânticos, FTS lexical e fusão RRF.
                                O reranking é realizado pelo modelo{' '}
                                <span className="font-semibold text-foreground">Gemini</span> para máxima relevância
                                contextual.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">✦ Embeddings semânticos</Badge>
                                <Badge variant="secondary">✦ Reranking com Gemini AI</Badge>
                                <Badge variant="outline">✦ pgvector + FTS híbrido</Badge>
                                <Badge variant="outline">✦ Reciprocal Rank Fusion</Badge>
                            </div>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <Button asChild>
                                    <Link href="/docs">Abrir documentacao tecnica</Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href="/docs/pt-br">Ver indice PT-BR</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Busca Híbrida */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Busca Híbrida</CardTitle>
                            <CardDescription>Digite o que voce procura.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="md:col-span-2 flex flex-col gap-1.5">
                                    <Label>O que voce quer encontrar?</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            required
                                            value={query}
                                            onChange={(event) => setQuery(event.target.value)}
                                            placeholder="Preciso de um cafe premium para acompanhar meu bolo de chocolate"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleClearQuery}
                                            disabled={query.length === 0 && !searchResult && !errorMessage}
                                        >
                                            Limpar
                                        </Button>
                                    </div>
                                </div>

                                <details className="md:col-span-2 rounded-lg border border-border bg-muted/30 p-3">
                                    <summary className="cursor-pointer text-sm font-medium text-foreground">
                                        Configuracoes avancadas (opcional)
                                    </summary>
                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div className="flex flex-col gap-1.5">
                                            <Label>Quantidade de resultados</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={limit}
                                                onChange={(event) => setLimit(Number(event.target.value))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label>Pular resultados (offset)</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={offset}
                                                onChange={(event) => setOffset(Number(event.target.value))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label>Equilibrio RRF (padrao 60)</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={rrfK}
                                                onChange={(event) => setRrfK(Number(event.target.value))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label>Itens para refinamento da IA</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={rerankCandidates}
                                                onChange={(event) => setRerankCandidates(Number(event.target.value))}
                                            />
                                        </div>
                                        <label className="md:col-span-2 flex items-center gap-2 text-sm font-medium text-foreground">
                                            <input
                                                type="checkbox"
                                                checked={rerank}
                                                onChange={(event) => setRerank(event.target.checked)}
                                                className="h-4 w-4 rounded border-input accent-primary"
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
                        </CardContent>
                    </Card>

                    {/* Cadastro de Produto */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Cadastro de Produto</CardTitle>
                            <CardDescription>
                                O produto é enfileirado para geração de embedding via pipeline assíncrono.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitIngest} className="flex flex-col gap-3">
                                <Input
                                    required
                                    value={ingestForm.name}
                                    onChange={(event) =>
                                        setIngestForm((prev) => ({ ...prev, name: event.target.value }))
                                    }
                                    placeholder="Nome do produto"
                                />
                                <Textarea
                                    required
                                    value={ingestForm.description}
                                    onChange={(event) =>
                                        setIngestForm((prev) => ({ ...prev, description: event.target.value }))
                                    }
                                    placeholder="Descrição do produto"
                                    className="min-h-24"
                                />
                                <Input
                                    required
                                    value={ingestForm.category}
                                    onChange={(event) =>
                                        setIngestForm((prev) => ({ ...prev, category: event.target.value }))
                                    }
                                    placeholder="Categoria"
                                />
                                <Button type="submit" disabled={ingestBusy} className="mt-1">
                                    {ingestBusy ? 'Enviando...' : 'Criar produto'}
                                </Button>
                            </form>

                            {createdProduct ? (
                                <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
                                    <p className="font-semibold">Produto enviado para pipeline de embedding.</p>
                                    <p className="mt-1 break-all text-muted-foreground">ID: {createdProduct.id}</p>
                                    <p className="text-muted-foreground">Status: {createdProduct.status}</p>
                                    {ingestionStatus ? (
                                        <div className={`mt-3 rounded-md border px-3 py-2 text-xs font-medium ${ingestStatusStyle}`}>
                                            <p>
                                                Estado:{' '}
                                                <span className="font-semibold uppercase">
                                                    {ingestionStatus.status}
                                                </span>
                                            </p>
                                            <p className="mt-1">
                                                {ingestionStatus.message ?? 'Aguardando atualizações...'}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </div>

                {/* ── COLUNA DIREITA — Resultados ── */}
                <div className="lg:sticky lg:top-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl">Resultados</CardTitle>
                                <div className="flex items-center gap-2">
                                    {hasSearchData ? (
                                        <Badge variant="secondary">
                                            {searchResult?.count ?? 0} itens
                                        </Badge>
                                    ) : null}
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={embeddingsMapHref}>Visualizar Mapa</Link>
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!hasSearchData ? (
                                <p className="text-sm text-muted-foreground">
                                    Execute uma busca para visualizar ranking, scores e metadados.
                                </p>
                            ) : (
                                <div className="max-h-[calc(100vh-10rem)] overflow-y-auto space-y-3 pr-1">
                                    {searchResult?.items.map((item, index) => {
                                        const categoryBadgeStyle = getCategoryBadgeStyle(item.category);

                                        return (
                                            <article
                                                key={item.id}
                                                className="rounded-lg border border-border bg-card overflow-hidden hover:shadow-md transition-shadow flex items-start"
                                            >
                                                {/* Imagem */}
                                                <div className="relative w-[30%] min-w-[120px] border-r border-border shrink-0">
                                                    <ProductImage
                                                        imageUrl={item.imageUrl}
                                                        name={item.name}
                                                        className="h-[180px] md:h-[220px]"
                                                    />
                                                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-semibold">
                                                        #{index + 1}
                                                    </div>
                                                </div>

                                                {/* Conteúdo */}
                                                <div className="p-4 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <h3 className="text-sm font-semibold text-foreground line-clamp-2">
                                                            {item.name}
                                                        </h3>
                                                        <span
                                                            className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none"
                                                            style={categoryBadgeStyle}
                                                        >
                                                            {item.category}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                                                        {item.description}
                                                    </p>

                                                    {/* Scores */}
                                                    <Separator className="mt-3 mb-3" />
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <Badge variant="secondary" className="font-mono">
                                                            RRF: {formatMaybeNumber(item.scores.rrf)}
                                                        </Badge>
                                                        <Badge variant="outline" className="font-mono">
                                                            Sem: {formatMaybeNumber(item.scores.semantic)}
                                                        </Badge>
                                                        <Badge variant="outline" className="font-mono">
                                                            Lex: {formatMaybeNumber(item.scores.lexical)}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-2 text-xs text-muted-foreground break-all font-mono">
                                                        ID: {item.id}
                                                    </p>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
