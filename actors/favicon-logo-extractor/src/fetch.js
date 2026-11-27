// Plain HTTP: one GET of the homepage, then small GETs of the icon and logo files it declares.
import { isIP } from 'node:net';

export const USER_AGENT = 'Mozilla/5.0 (compatible; pampa-data-logo-extractor/0.1; +https://apify.com/pampa-data)';
export const MAX_HTML_BYTES = 3 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export class FetchError extends Error {
    constructor(message, statusCode = null) {
        super(message);
        this.statusCode = statusCode;
    }
}

/** Reads at most maxBytes of a response body. Returns { buffer, truncated }. */
export async function readLimited(res, maxBytes) {
    if (!res.body) return { buffer: Buffer.alloc(0), truncated: false };
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    let truncated = false;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
        if (size > maxBytes) {
            truncated = true;
            break;
        }
    }
    reader.cancel().catch(() => {});
    return { buffer: Buffer.concat(chunks), truncated };
}

function isPrivateIp(host) {
    const h = host.replace(/^\[|\]$/g, '');
    const v = isIP(h);
    if (v === 4) {
        const [a, b] = h.split('.').map(Number);
        return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
            || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
    }
    if (v === 6) return h === '::1' || /^f[cd]/i.test(h) || /^fe80/i.test(h) || h === '::';
    return false;
}

/** Image URLs come from third-party pages: allow only public http(s) addresses (and small data: URIs). */
export function isFetchableUrl(href) {
    let url;
    try {
        url = new URL(href);
    } catch {
        return false;
    }
    if (url.protocol === 'data:') return true;
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (/^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname)) return false;
    return !isPrivateIp(url.hostname);
}

export async function fetchPage(url, { fetchImpl = fetch, timeoutMs = 30000 } = {}) {
    let res;
    try {
        res = await fetchImpl(url, {
            redirect: 'follow',
            signal: AbortSignal.timeout(timeoutMs),
            headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'accept-language': 'en' },
        });
    } catch (err) {
        throw new FetchError(err.name === 'TimeoutError' ? 'Timed out' : (err.cause?.code ?? err.message));
    }
    if (res.status >= 400) {
        res.body?.cancel?.().catch(() => {});
        throw new FetchError(`HTTP ${res.status}`, res.status);
    }
    const type = res.headers.get('content-type') ?? '';
    if (type && !/html|xml|text\/plain/i.test(type)) {
        res.body?.cancel?.().catch(() => {});
        throw new FetchError(`Not an HTML page (${type.split(';')[0]})`, res.status);
    }
    const { buffer } = await readLimited(res, MAX_HTML_BYTES);
    return { url: res.url || url, statusCode: res.status, html: buffer.toString('utf8') };
}

export function decodeDataUri(href) {
    const m = /^data:([^;,]*)((?:;[^;,]*)*),(.*)$/s.exec(href);
    if (!m) return null;
    const base64 = /;base64/i.test(m[2]);
    try {
        const buffer = base64 ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8');
        return { contentType: m[1] || 'text/plain', buffer };
    } catch {
        return null;
    }
}

/** GET an image. Returns { ok, status, finalUrl, contentType, buffer, truncated, bytes } or { ok: false, error }. */
export async function fetchImage(href, { fetchImpl = fetch, timeoutMs = 15000, referer } = {}) {
    if (href.startsWith('data:')) {
        const d = decodeDataUri(href);
        if (!d) return { ok: false, error: 'Bad data URI' };
        return { ok: true, status: 200, finalUrl: href, contentType: d.contentType, buffer: d.buffer, truncated: false, bytes: d.buffer.length };
    }
    if (!isFetchableUrl(href)) return { ok: false, error: 'Not a public URL' };
    let res;
    try {
        const headers = { 'user-agent': USER_AGENT, accept: 'image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.8' };
        if (referer) headers.referer = referer;
        res = await fetchImpl(href, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers });
    } catch (err) {
        return { ok: false, error: err.name === 'TimeoutError' ? 'Timed out' : (err.cause?.code ?? err.message) };
    }
    if (res.status >= 400) {
        res.body?.cancel?.().catch(() => {});
        return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const length = Number(res.headers.get('content-length')) || null;
    const { buffer, truncated } = await readLimited(res, MAX_IMAGE_BYTES);
    return {
        ok: true,
        status: res.status,
        finalUrl: res.url || href,
        contentType,
        buffer,
        truncated,
        bytes: truncated ? length : buffer.length,
    };
}
