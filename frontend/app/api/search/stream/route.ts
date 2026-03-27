import { NextRequest } from 'next/server';

import { buildBackendUrl, readCorrelationId } from '@/lib/backend';

export async function GET(req: NextRequest): Promise<Response> {
    const correlationId = readCorrelationId(req.headers.get('x-correlation-id'));
    const url = new URL(req.url);

    const upstream = await fetch(buildBackendUrl('/search/stream', url.searchParams), {
        headers: {
            'x-correlation-id': correlationId,
            accept: 'text/event-stream',
        },
        cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
        return new Response('SSE upstream connection failed', { status: 502 });
    }

    return new Response(upstream.body, {
        status: 200,
        headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache, no-transform',
            'x-accel-buffering': 'no',
        },
    });
}
