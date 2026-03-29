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
            <section className="docs-enter rounded-[2rem] bg-white/90 p-6 shadow-soft backdrop-blur md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <p className="text-sm uppercase tracking-[0.28em] text-sea">filesystem documentation</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold text-ink md:text-5xl">{page.title}</h1>
                            <span className="rounded-full border border-sea/15 bg-sea/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sea">
                                {page.localeLabel}
                            </span>
                        </div>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">{page.summary}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/"
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
                        >
                            Voltar ao console
                        </Link>
                        <Link
                            href={localeIndexHref}
                            className="rounded-2xl border border-coral/20 bg-coral/10 px-4 py-2 text-sm font-semibold text-coral transition hover:-translate-y-0.5 hover:bg-coral/15"
                        >
                            {localeIndexLabel}
                        </Link>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-white/70 bg-mist/70 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Source of truth</p>
                        <p className="mt-3 text-sm font-semibold text-ink">{page.sourcePath}</p>
                        <p className="mt-2 text-sm text-slate-600">Altere o conteudo no arquivo e a pagina reflete a mudanca sem mover a documentacao para dentro do codigo.</p>
                    </div>
                    <div className="rounded-3xl border border-white/70 bg-sand/75 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Coverage</p>
                        <p className="mt-3 text-2xl font-bold text-ink">{page.totalDocuments}</p>
                        <p className="mt-2 text-sm text-slate-600">documentos navegaveis organizados em {page.sectionCount} blocos editoriais.</p>
                    </div>
                    <div className="rounded-3xl border border-white/70 bg-slate-950 p-4 text-slate-100">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workflow</p>
                        <p className="mt-3 text-sm font-semibold text-white">Arquivo .md -&gt; filesystem -&gt; App Router</p>
                        <p className="mt-2 text-sm text-slate-300">Leitura server-side com navegacao gerada a partir dos arquivos e dos indices existentes.</p>
                    </div>
                </div>
            </section>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="docs-enter-delay xl:sticky xl:top-6 xl:self-start">
                    <div className="rounded-[2rem] bg-white/88 p-5 shadow-soft backdrop-blur">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Documentation map</p>
                                <h2 className="mt-2 text-2xl font-bold text-ink">Abordagens, tech e workflows</h2>
                            </div>
                        </div>

                        <div className="mt-5 space-y-5">
                            {page.sections.map((section) => (
                                <section key={section.title}>
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{section.title}</p>
                                    <nav className="mt-3 space-y-2">
                                        {section.items.map((item) => {
                                            const isActive = item.href === page.href;

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`group flex items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${isActive
                                                        ? 'border-sea/30 bg-sea/10 text-ink shadow-sm'
                                                        : 'border-transparent bg-slate-50/80 text-slate-600 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white'}`}
                                                >
                                                    <span className={`mt-1 h-2.5 w-2.5 rounded-full transition ${isActive ? 'bg-sea' : 'bg-slate-300 group-hover:bg-coral'}`} />
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

                <article className="docs-enter rounded-[2rem] bg-white/88 p-6 shadow-soft backdrop-blur md:p-8">
                    <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">Updated {formatDate(page.lastUpdated)}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">Editable source: {page.sourcePath}</span>
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