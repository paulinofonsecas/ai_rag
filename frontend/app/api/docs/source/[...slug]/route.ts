import { readFile } from 'node:fs/promises';

import { getRawDocsFile } from '../../../../../lib/docs';

type SourceRouteProps = {
    params: Promise<{
        slug?: string[];
    }>;
};

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: SourceRouteProps) {
    const { slug = [] } = await params;
    const file = await getRawDocsFile(slug);

    if (!file) {
        return new Response('Not found', { status: 404 });
    }

    const content = await readFile(file.absolutePath);

    return new Response(content, {
        status: 200,
        headers: {
            'content-type': file.contentType,
            'content-disposition': `inline; filename="${file.fileName}"`,
        },
    });
}