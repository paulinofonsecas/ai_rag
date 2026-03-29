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
                    <Link href={resolved.href} className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors">
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
                    className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
                >
                    {children}
                </a>
            );
        },
        code: ({ children, ...props }) => (
            <code {...props} className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground">
                {children}
            </code>
        ),
        pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border border-border bg-zinc-950 px-4 py-4 text-sm text-zinc-100 shadow-sm">
                {children}
            </pre>
        ),
        table: ({ children }) => (
            <div className="overflow-x-auto">
                <table>{children}</table>
            </div>
        ),
        blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-border bg-muted/50 px-4 py-3 text-muted-foreground">
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