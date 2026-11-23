// Plain HTTP requests with redirects followed by hand, so every hop of the redirect chain is recorded.
import { gunzipSync } from 'node:zlib';

export const USER_AGENT = 'Mozilla/5.0 (compatible; pampa-data-seo-audit/0.1; +https://apify.com/pampa-data)';
export const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 10;

export class FetchError extends Error {
    constructor(message, { statusCode = null, redirectChain = [] } = {}) {
        super(message);
        this.statusCode = statusCode;
        this.redirectChain = redirectChain;
    }
}

async function readLimited(res, maxBytes) {
    if (!res.body) return { buffer: Buffer.alloc(0), truncated: false };
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    let truncated = false;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
        if (size >= maxBytes) {
            truncated = true;
            break;
        }
    }
    reader.cancel().catch(() => {});
    return { buffer: Buffer.concat(chunks), truncated };
}

function headersOf(res) {
    const headers = {};
    res.headers.forEach((v, k) => { if (k !== 'set-cookie') headers[k] = v; });
    return headers;
}

/**
 * GET a URL and follow up to 10 redirects. Returns the final response with the chain of hops before it.
 * `accept` decides what body is read: HTML-ish pages, XML sitemaps or plain text.
 */
export async function fetchUrl(url, { fetchImpl = fetch, timeoutMs = 30000, accept = 'text/html,application/xhtml+xml,*/*;q=0.8', maxBytes = MAX_BYTES } = {}) {
    const started = Date.now();
    const redirectChain = [];
    let current = url;
    for (let hop = 0; ; hop++) {
        let res;
        try {
            res = await fetchImpl(current, {
                redirect: 'manual',
                signal: AbortSignal.timeout(timeoutMs),
                headers: { 'user-agent': USER_AGENT, accept, 'accept-language': 'en' },
            });
        } catch (err) {
            const reason = err.name === 'TimeoutError' ? 'Timed out' : (err.cause?.code ?? err.cause?.message ?? err.message);
            throw new FetchError(reason, { redirectChain });
        }
        const location = res.headers.get('location');
        if (res.status >= 300 && res.status < 400 && location) {
            res.body?.cancel?.().catch(() => {});
            let next;
            try {
                next = new URL(location, current).href;
            } catch {
                throw new FetchError(`Invalid redirect location: ${location}`, { statusCode: res.status, redirectChain });
            }
            redirectChain.push({ url: current, statusCode: res.status });
            if (hop + 1 > MAX_REDIRECTS) throw new FetchError('Too many redirects', { statusCode: res.status, redirectChain });
            if (redirectChain.some((r) => r.url === next)) throw new FetchError('Redirect loop', { statusCode: res.status, redirectChain });
            current = next;
            continue;
        }
        const contentType = res.headers.get('content-type') ?? '';
        const readable = !contentType || /html|xml|text|json|gzip|octet-stream/i.test(contentType);
        const { buffer, truncated } = readable ? await readLimited(res, maxBytes) : { buffer: Buffer.alloc(0), truncated: false };
        if (!readable) res.body?.cancel?.().catch(() => {});
        return {
            requestedUrl: url,
            url: current,
            statusCode: res.status,
            contentType,
            headers: headersOf(res),
            redirectChain,
            responseTimeMs: Date.now() - started,
            bytes: buffer.length,
            truncated,
            buffer,
        };
    }
}

/** Body as text; gzip files (sitemap.xml.gz) are unpacked. */
export function bodyText(response) {
    const b = response.buffer;
    if (b.length > 2 && b[0] === 0x1f && b[1] === 0x8b) {
        try {
            return gunzipSync(b, { maxOutputLength: 50 * 1024 * 1024 }).toString('utf8');
        } catch {
            return '';
        }
    }
    return b.toString('utf8');
}

/** Limits parallel requests per host so we stay polite to one website while auditing many. */
export class HostLimiter {
    constructor(perHost = 3) {
        this.perHost = perHost;
        this.active = new Map();
        this.waiting = new Map();
    }

    async run(host, fn) {
        while ((this.active.get(host) ?? 0) >= this.perHost) {
            await new Promise((resolve) => {
                const list = this.waiting.get(host) ?? [];
                list.push(resolve);
                this.waiting.set(host, list);
            });
        }
        this.active.set(host, (this.active.get(host) ?? 0) + 1);
        try {
            return await fn();
        } finally {
            this.active.set(host, this.active.get(host) - 1);
            const next = this.waiting.get(host)?.shift();
            if (next) next();
        }
    }
}
