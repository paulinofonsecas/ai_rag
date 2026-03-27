import { NextRequest, NextResponse } from 'next/server';

import { buildBackendUrl, readCorrelationId } from '@/lib/backend';

export async function GET(req: NextRequest) {
    const correlationId = readCorrelationId(req.headers.get('x-correlation-id'));

    try {
        const upstreamResponse = await fetch(buildBackendUrl('/search/export-embeddings'), {
            method: 'GET',
            headers: {
                'x-correlation-id': correlationId,
            },
            cache: 'no-store',
        });

        const body = await upstreamResponse.arrayBuffer();
        const contentType = upstreamResponse.headers.get('content-type') ?? 'text/tab-separated-values; charset=utf-8';

        return new NextResponse(body, {
            status: upstreamResponse.status,
            headers: {
                'content-type': contentType,
                'content-disposition': upstreamResponse.headers.get('content-disposition') ?? 'attachment; filename="embeddings.tsv"',
                'x-correlation-id': upstreamResponse.headers.get('x-correlation-id') ?? correlationId,
            },
        });
    } catch {
        return NextResponse.json(
            { error: 'Nao foi possivel conectar ao backend para exportacao de embeddings.' },
            {
                status: 503,
                headers: {
                    'x-correlation-id': correlationId,
                },
            },
        );
    }
}
