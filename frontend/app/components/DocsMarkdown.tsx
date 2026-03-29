import Link from 'next/link';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { DocsLocale, resolveDocsLink } from '../../lib/docs';

type DocsMarkdownProps = {
    markdown: string;
    locale: DocsLocale;
    currentRelativePath: string;
};

export default function DocsMarkdown({
    markdown,
    locale,
    currentRelativePath,
}: DocsMarkdownProps) {
    const components: Components = {
        a: ({ href = '', children, ...props }) => {
            const resolved = resolveDocsLink(href, locale, currentRelativePath);

            if (resolved.kind === 'page') {
                return (
                    <Link href={resolved.href} className="font-semibold text-sea underline decoration-sea/35 underline-offset-4 hover:text-coral">
                        {children}
                    </Link>
                );
            }

            const isExternal = resolved.kind === 'asset' || href.startsWith('http');

            return (
                <a
                    {...props}
                    href={resolved.href}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noreferrer' : undefined}
                    className="font-semibold text-sea underline decoration-sea/35 underline-offset-4 hover:text-coral"
                >
                    {children}
                </a>
            );
        },
        code: ({ children, ...props }) => (
            <code {...props} className="rounded-lg bg-mist px-1.5 py-1 font-mono text-[0.92em] text-ink">
                {children}
            </code>
        ),
        pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 text-sm text-slate-100 shadow-inner">
                {children}
            </pre>
        ),
        table: ({ children }) => (
            <div className="overflow-x-auto">
                <table>{children}</table>
            </div>
        ),
        blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-coral/45 bg-sand/60 px-4 py-3 text-slate-700">
                {children}
            </blockquote>
        ),
    };

    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {markdown}
        </ReactMarkdown>
    );
}