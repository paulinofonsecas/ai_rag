import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getDocPageData, splitLocaleFromSlug } from '../../../lib/docs';
import DocsMarkdown from '../../components/DocsMarkdown';

type DocsPageProps = {
    params: Promise<{
        slug?: string[];
    }>;
};

export const dynamic = 'force-dynamic';

function formatDate(isoTimestamp: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(isoTimestamp));
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
    const { slug = [] } = await params;
    const page = await getDocPageData(slug);

    if (!page) {
        return {
            title: 'Documentation Not Found',
        };
    }

    return {
        title: `${page.title} | Technical Docs`,
        description: page.summary,
    };
}

export default async function DocsPage({ params }: DocsPageProps) {
    const { slug = [] } = await params;
    const page = await getDocPageData(slug);

    if (!page) {
        notFound();
    }

    const { locale } = splitLocaleFromSlug(slug);
    const localeIndexHref = locale === 'pt-br' ? '/docs' : '/docs/pt-br';
    const localeIndexLabel = locale === 'pt-br' ? 'Open EN index' : 'Abrir indice PT-BR';

    return (
        <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
            <section className="docs-enter rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">filesystem documentation</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold text-foreground md:text-5xl">{page.title}</h1>
                            <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                                {page.localeLabel}
                            </span>
                        </div>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">{page.summary}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/"
                            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            Voltar ao console
                        </Link>
                        <Link
                            href={localeIndexHref}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                        >
                            {localeIndexLabel}
                        </Link>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Source of truth</p>
                        <p className="mt-3 text-sm font-semibold text-foreground">{page.sourcePath}</p>
                        <p className="mt-2 text-sm text-muted-foreground">Altere o conteudo no arquivo e a pagina reflete a mudanca sem mover a documentacao para dentro do codigo.</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Coverage</p>
                        <p className="mt-3 text-2xl font-bold text-foreground">{page.totalDocuments}</p>
                        <p className="mt-2 text-sm text-muted-foreground">documentos navegaveis organizados em {page.sectionCount} blocos editoriais.</p>
                    </div>
                    <div className="rounded-lg border border-border bg-zinc-950 p-4 text-zinc-100">
                        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Workflow</p>
                        <p className="mt-3 text-sm font-semibold text-white">Arquivo .md -&gt; filesystem -&gt; App Router</p>
                        <p className="mt-2 text-sm text-zinc-300">Leitura server-side com navegacao gerada a partir dos arquivos e dos indices existentes.</p>
                    </div>
                </div>
            </section>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="docs-enter-delay xl:sticky xl:top-6 xl:self-start">
                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Documentation map</p>
                                <h2 className="mt-2 text-2xl font-bold text-foreground">Abordagens, tech e workflows</h2>
                            </div>
                        </div>

                        <div className="mt-5 space-y-5">
                            {page.sections.map((section) => (
                                <section key={section.title}>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{section.title}</p>
                                    <nav className="mt-3 space-y-2">
                                        {section.items.map((item) => {
                                            const isActive = item.href === page.href;

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`group flex items-start gap-3 rounded-lg border px-3 py-3 text-sm transition ${isActive
                                                        ? 'border-border bg-accent text-accent-foreground shadow-sm'
                                                        : 'border-transparent bg-muted/40 text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground'}`}
                                                >
                                                    <span className={`mt-1 h-2.5 w-2.5 rounded-full transition ${isActive ? 'bg-foreground' : 'bg-muted-foreground/40 group-hover:bg-foreground'}`} />
                                                    <span className="leading-6">{item.title}</span>
                                                </Link>
                                            );
                                        })}
                                    </nav>
                                </section>
                            ))}
                        </div>
                    </div>
                </aside>

                <article className="docs-enter rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
                    <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">Updated {formatDate(page.lastUpdated)}</span>
                        <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">Editable source: {page.sourcePath}</span>
                    </div>

                    <div className="docs-prose">
                        <DocsMarkdown
                            markdown={page.content}
                            locale={page.locale}
                            currentRelativePath={page.relativePath}
                        />
                    </div>
                </article>
            </div>
        </main>
    );
}