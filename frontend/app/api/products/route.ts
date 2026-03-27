import { NextRequest, NextResponse } from 'next/server';

import { buildBackendUrl, readCorrelationId } from '@/lib/backend';

export async function POST(req: NextRequest) {
    const correlationId = readCorrelationId(req.headers.get('x-correlation-id'));

    let payload: unknown;
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: 'Body invalido.' }, { status: 400 });
    }

    const upstreamResponse = await fetch(buildBackendUrl('/products'), {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-correlation-id': correlationId,
        },
        body: JSON.stringify(payload),
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
