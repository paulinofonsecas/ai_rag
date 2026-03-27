import { NextRequest, NextResponse } from 'next/server';

import { buildBackendUrl, readCorrelationId } from '@/lib/backend';

export async function GET(req: NextRequest) {
    const correlationId = readCorrelationId(req.headers.get('x-correlation-id'));
    const requestUrl = new URL(req.url);

    const searchParams = new URLSearchParams();
    const ids = requestUrl.searchParams.get('ids');
    if (ids && ids.trim().length > 0) {
        searchParams.set('ids', ids);
    }

    try {
        const upstreamResponse = await fetch(buildBackendUrl('/search/embeddings', searchParams), {
            method: 'GET',
            headers: {
                'x-correlation-id': correlationId,
            },
            cache: 'no-store',
        });

        const text = await upstreamResponse.text();
        const contentType = upstreamResponse.headers.get('content-type') ?? 'application/json';

        return new NextResponse(text, {
            status: upstreamResponse.status,
            headers: {
                'content-type': contentType,
                'x-correlation-id': upstreamResponse.headers.get('x-correlation-id') ?? correlationId,
            },
        });
    } catch {
        return NextResponse.json(
            { error: 'Nao foi possivel conectar ao backend para visualizar embeddings.' },
            {
                status: 503,
                headers: {
                    'x-correlation-id': correlationId,
                },
            },
        );
    }
}
