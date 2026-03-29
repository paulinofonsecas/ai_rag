import 'server-only';

import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export type DocsLocale = 'default' | 'pt-br';

export type DocNavItem = {
    title: string;
    href: string;
    relativePath: string;
};

export type DocNavSection = {
    title: string;
    items: DocNavItem[];
};

export type DocPageData = {
    title: string;
    summary: string;
    content: string;
    href: string;
    locale: DocsLocale;
    localeLabel: string;
    sourcePath: string;
    relativePath: string;
    sections: DocNavSection[];
    lastUpdated: string;
    totalDocuments: number;
    sectionCount: number;
};

type ParsedIndexSection = {
    title: string;
    items: Array<{
        title: string;
        relativePath: string;
    }>;
};

const DOCS_ROOT = path.resolve(process.cwd(), '../docs');
const INDEX_FILE_NAME = 'INDEX.md';
const README_FILE_NAME = 'README.md';
const MARKDOWN_EXTENSION = '.md';
const SECTION_HEADING_PATTERN = /^##\s+(.+)$/;
const MARKDOWN_LINK_PATTERN = /^\s*-\s+\[([^\]]+)\]\(([^)]+)\)\s*$/;
const EXTERNAL_LINK_PATTERN = /^(?:[a-z]+:)?\/\//i;

function getLocaleBaseDir(locale: DocsLocale): string {
    return locale === 'pt-br' ? path.join(DOCS_ROOT, 'pt-br') : DOCS_ROOT;
}

function getLocalePrefix(locale: DocsLocale): string {
    return locale === 'pt-br' ? '/docs/pt-br' : '/docs';
}

function getLocaleLabel(locale: DocsLocale): string {
    return locale === 'pt-br' ? 'PT-BR' : 'EN';
}

function ensureSafeSegments(segments: string[]): string[] {
    return segments
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => segment.replace(/\.md$/i, ''))
        .filter((segment) => segment !== '.' && segment !== '..' && !segment.includes('/') && !segment.includes('\\'));
}

function ensureSafeFileSegments(segments: string[]): string[] {
    return segments
        .map((segment) => segment.trim())
        .filter(Boolean)
        .filter((segment) => segment !== '.' && segment !== '..' && !segment.includes('/') && !segment.includes('\\'));
}

function ensureInsideBaseDir(baseDir: string, candidatePath: string): void {
    const relative = path.relative(baseDir, candidatePath);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error('Attempted to access a path outside docs root.');
    }
}

async function pathExists(candidatePath: string): Promise<boolean> {
    try {
        await access(candidatePath);
        return true;
    } catch {
        return false;
    }
}

function normalizeRelativePath(relativePath: string): string {
    return relativePath.replace(/\\/g, '/');
}

function normalizeRouteSegmentsFromRelativePath(relativePath: string): string[] {
    const withoutExtension = normalizeRelativePath(relativePath).replace(/\.md$/i, '');
    const parts = withoutExtension.split('/').filter(Boolean);
    const lastSegment = parts.at(-1)?.toLowerCase();

    if (lastSegment === 'index' || lastSegment === 'readme') {
        parts.pop();
    }

    return parts;
}

function buildDocsHrefFromRelativePath(locale: DocsLocale, relativePath: string): string {
    const prefix = getLocalePrefix(locale);
    const parts = normalizeRouteSegmentsFromRelativePath(relativePath);

    return parts.length > 0 ? `${prefix}/${parts.join('/')}` : prefix;
}

function buildRepoRelativeSourcePath(locale: DocsLocale, relativePath: string): string {
    const parts = ['docs'];

    if (locale === 'pt-br') {
        parts.push('pt-br');
    }

    parts.push(...normalizeRelativePath(relativePath).split('/'));
    return parts.join('/');
}

function deriveTitleFromRelativePath(relativePath: string): string {
    const parts = normalizeRouteSegmentsFromRelativePath(relativePath);
    const fallback = parts.at(-1) ?? 'index';

    return fallback
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function extractTitle(markdown: string): string | null {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim() ?? null;
}

function extractSummary(markdown: string): string {
    const lines = markdown
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    for (const line of lines) {
        if (
            line.startsWith('#') ||
            line.startsWith('- ') ||
            line.startsWith('|') ||
            line.startsWith('```') ||
            line.startsWith('$$')
        ) {
            continue;
        }

        return line;
    }

    return 'Documentacao tecnica servida diretamente do sistema de arquivos.';
}

async function collectMarkdownFiles(baseDir: string, nestedPath = ''): Promise<string[]> {
    const currentDir = nestedPath ? path.join(baseDir, nestedPath) : baseDir;
    const entries = await readdir(currentDir, { withFileTypes: true });
    const markdownFiles: string[] = [];

    for (const entry of entries) {
        if (entry.name.startsWith('.')) {
            continue;
        }

        if (entry.isDirectory()) {
            if (entry.name === 'pt-br') {
                continue;
            }

            const childPath = nestedPath ? path.join(nestedPath, entry.name) : entry.name;
            markdownFiles.push(...(await collectMarkdownFiles(baseDir, childPath)));
            continue;
        }

        if (path.extname(entry.name).toLowerCase() !== MARKDOWN_EXTENSION) {
            continue;
        }

        const relativePath = nestedPath ? path.join(nestedPath, entry.name) : entry.name;
        markdownFiles.push(normalizeRelativePath(relativePath));
    }

    return markdownFiles;
}

async function parseIndexSections(locale: DocsLocale): Promise<ParsedIndexSection[]> {
    const baseDir = getLocaleBaseDir(locale);
    const indexPath = path.join(baseDir, INDEX_FILE_NAME);
    const content = await readFile(indexPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const sections: ParsedIndexSection[] = [];
    let activeSection: ParsedIndexSection | null = null;

    for (const line of lines) {
        const headingMatch = line.match(SECTION_HEADING_PATTERN);

        if (headingMatch) {
            activeSection = {
                title: headingMatch[1].trim(),
                items: [],
            };
            sections.push(activeSection);
            continue;
        }

        const linkMatch = line.match(MARKDOWN_LINK_PATTERN);

        if (!linkMatch || !activeSection) {
            continue;
        }

        const [, title, rawHref] = linkMatch;

        if (EXTERNAL_LINK_PATTERN.test(rawHref)) {
            continue;
        }

        const resolved = path.resolve(path.dirname(indexPath), rawHref);

        try {
            ensureInsideBaseDir(baseDir, resolved);
        } catch {
            continue;
        }

        if (path.extname(resolved).toLowerCase() !== MARKDOWN_EXTENSION) {
            continue;
        }

        const relativePath = normalizeRelativePath(path.relative(baseDir, resolved));

        activeSection.items.push({
            title: title.trim(),
            relativePath,
        });
    }

    return sections.filter((section) => section.items.length > 0);
}

async function resolveDocumentPath(locale: DocsLocale, segments: string[]): Promise<string | null> {
    const baseDir = getLocaleBaseDir(locale);
    const safeSegments = ensureSafeSegments(segments);

    if (safeSegments.length === 0) {
        return path.join(baseDir, INDEX_FILE_NAME);
    }

    const basePath = path.join(baseDir, ...safeSegments);
    ensureInsideBaseDir(baseDir, basePath);

    const candidates = [
        `${basePath}${MARKDOWN_EXTENSION}`,
        path.join(basePath, INDEX_FILE_NAME),
        path.join(basePath, README_FILE_NAME),
    ];

    for (const candidate of candidates) {
        ensureInsideBaseDir(baseDir, candidate);

        if (await pathExists(candidate)) {
            return candidate;
        }
    }

    return null;
}

export function splitLocaleFromSlug(slug: string[] = []): {
    locale: DocsLocale;
    segments: string[];
} {
    const safeSegments = ensureSafeSegments(slug);

    if (safeSegments[0] === 'pt-br') {
        return {
            locale: 'pt-br',
            segments: safeSegments.slice(1),
        };
    }

    return {
        locale: 'default',
        segments: safeSegments,
    };
}

export async function getDocNavigation(locale: DocsLocale): Promise<DocNavSection[]> {
    const baseDir = getLocaleBaseDir(locale);
    const [indexedSections, allFiles] = await Promise.all([
        parseIndexSections(locale),
        collectMarkdownFiles(baseDir),
    ]);

    const seenPaths = new Set<string>([INDEX_FILE_NAME]);
    const sections: DocNavSection[] = [
        {
            title: locale === 'pt-br' ? 'Inicio' : 'Start',
            items: [
                {
                    title: locale === 'pt-br' ? 'Indice' : 'Index',
                    relativePath: INDEX_FILE_NAME,
                    href: getLocalePrefix(locale),
                },
            ],
        },
    ];

    for (const section of indexedSections) {
        const items = section.items.map((item) => {
            seenPaths.add(item.relativePath);

            return {
                title: item.title,
                relativePath: item.relativePath,
                href: buildDocsHrefFromRelativePath(locale, item.relativePath),
            };
        });

        if (items.length > 0) {
            sections.push({
                title: section.title,
                items,
            });
        }
    }

    const additionalItems = allFiles
        .filter((relativePath) => !seenPaths.has(relativePath))
        .map((relativePath) => ({
            title: deriveTitleFromRelativePath(relativePath),
            relativePath,
            href: buildDocsHrefFromRelativePath(locale, relativePath),
        }))
        .sort((left, right) => left.title.localeCompare(right.title));

    if (additionalItems.length > 0) {
        sections.push({
            title: locale === 'pt-br' ? 'Documentos adicionais' : 'Additional documents',
            items: additionalItems,
        });
    }

    return sections;
}

export async function getDocPageData(slug: string[] = []): Promise<DocPageData | null> {
    const { locale, segments } = splitLocaleFromSlug(slug);
    const absolutePath = await resolveDocumentPath(locale, segments);

    if (!absolutePath) {
        return null;
    }

    const baseDir = getLocaleBaseDir(locale);
    const relativePath = normalizeRelativePath(path.relative(baseDir, absolutePath));
    const [content, stats, sections] = await Promise.all([
        readFile(absolutePath, 'utf8'),
        stat(absolutePath),
        getDocNavigation(locale),
    ]);

    const title = extractTitle(content) ?? deriveTitleFromRelativePath(relativePath);
    const summary = extractSummary(content);
    const totalDocuments = sections.reduce((total, section) => total + section.items.length, 0);

    return {
        title,
        summary,
        content,
        href: buildDocsHrefFromRelativePath(locale, relativePath),
        locale,
        localeLabel: getLocaleLabel(locale),
        sourcePath: buildRepoRelativeSourcePath(locale, relativePath),
        relativePath,
        sections,
        lastUpdated: stats.mtime.toISOString(),
        totalDocuments,
        sectionCount: sections.length,
    };
}

export function resolveDocsLink(
    href: string,
    locale: DocsLocale,
    currentRelativePath: string,
): {
    href: string;
    kind: 'page' | 'asset' | 'external';
} {
    if (!href || href.startsWith('#') || EXTERNAL_LINK_PATTERN.test(href)) {
        return {
            href,
            kind: 'external',
        };
    }

    const baseDir = getLocaleBaseDir(locale);
    const currentDocDir = path.dirname(path.join(baseDir, currentRelativePath));
    const resolved = path.resolve(currentDocDir, href);
    const relativeToDocsRoot = normalizeRelativePath(path.relative(DOCS_ROOT, resolved));

    ensureInsideBaseDir(DOCS_ROOT, resolved);

    if (path.extname(resolved).toLowerCase() === MARKDOWN_EXTENSION) {
        const relativeToLocaleBase = normalizeRelativePath(path.relative(getLocaleBaseDir(locale), resolved));

        return {
            href: buildDocsHrefFromRelativePath(locale, relativeToLocaleBase),
            kind: 'page',
        };
    }

    return {
        href: `/api/docs/source/${relativeToDocsRoot}`,
        kind: 'asset',
    };
}

export async function getRawDocsFile(routeSegments: string[]): Promise<{
    absolutePath: string;
    contentType: string;
    fileName: string;
} | null> {
    const safeSegments = ensureSafeFileSegments(routeSegments);

    if (safeSegments.length === 0) {
        return null;
    }

    const absolutePath = path.join(DOCS_ROOT, ...safeSegments);
    ensureInsideBaseDir(DOCS_ROOT, absolutePath);

    if (!(await pathExists(absolutePath))) {
        return null;
    }

    const extension = path.extname(absolutePath).toLowerCase();
    const contentType = extension === '.md'
        ? 'text/markdown; charset=utf-8'
        : extension === '.puml'
            ? 'text/plain; charset=utf-8'
            : 'application/octet-stream';

    return {
        absolutePath,
        contentType,
        fileName: path.basename(absolutePath),
    };
}