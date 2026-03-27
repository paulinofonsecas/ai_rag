import { NextRequest, NextResponse } from 'next/server';

import { buildBackendUrl, readCorrelationId } from '@/lib/backend';

export async function GET(req: NextRequest) {
    const correlationId = readCorrelationId(req.headers.get('x-correlation-id'));
    const url = new URL(req.url);

    const upstreamResponse = await fetch(buildBackendUrl('/search', url.searchParams), {
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
}
