import { NextRequest } from 'next/server';

import { buildBackendUrl, readCorrelationId } from '@/lib/backend';

type Params = {
    params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: Params): Promise<Response> {
    const correlationId = readCorrelationId(req.headers.get('x-correlation-id'));
    const { id } = await params;

    const upstream = await fetch(buildBackendUrl(`/products/${id}/stream`), {
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
