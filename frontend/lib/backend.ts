const backendBaseUrl =
    process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

export function buildBackendUrl(pathname: string, searchParams?: URLSearchParams): string {
    const url = new URL(pathname, backendBaseUrl);

    if (searchParams) {
        url.search = searchParams.toString();
    }

    return url.toString();
}

export function readCorrelationId(headerValue: string | null): string {
    if (headerValue && headerValue.trim().length > 0) {
        return headerValue;
    }

    return crypto.randomUUID();
}
