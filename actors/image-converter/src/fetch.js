// Downloads an image with redirects followed by hand, a size cap, and the Apify token only for Apify storage URLs.

export const USER_AGENT = 'Mozilla/5.0 (compatible; pampa-data-image-converter/0.1; +https://apify.com/pampa-data)';
const MAX_REDIRECTS = 10;
const ACCEPT = 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.9,*/*;q=0.5';

export class FetchError extends Error {
    constructor(message, { statusCode = null } = {}) {
        super(message);
        this.statusCode = statusCode;
    }
}

/** The run's own token is sent to api.apify.com only, so files in the user's private key-value stores can be read. */
export function authHeaders(url, token = process.env.APIFY_TOKEN) {
    const { hostname, protocol } = new URL(url);
    return token && protocol === 'https:' && hostname === 'api.apify.com' ? { authorization: `Bearer ${token}` } : {};
}

/** Image type from the first bytes, or null. HEIC is recognised so it can be reported as unsupported. */
export function sniffImage(buf) {
    if (buf.length < 12) return null;
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buf.toString('latin1', 0, 4) === 'GIF8') return 'gif';
    if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
    const head = buf.toString('latin1', 0, 4);
    if (head === 'II*\0' || head === 'MM\0*') return 'tiff';
    if (buf.toString('latin1', 4, 8) === 'ftyp') {
        const brands = buf.toString('latin1', 8, Math.min(buf.length, 64));
        if (/avi[fs]/.test(brands)) return 'avif';
        if (/hei[cxms]|hev[cx]|mif1/.test(brands)) return 'heic';
    }
    if (/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(buf.toString('utf8', 0, 512))) return 'svg';
    return null;
}

async function readLimited(res, maxBytes) {
    if (!res.body) return Buffer.alloc(0);
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > maxBytes) {
            reader.cancel().catch(() => {});
            throw new FetchError(`File is larger than ${Math.round(maxBytes / 1048576)} MB (raise maxFileSizeMb to convert it)`);
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}

/** File name from Content-Disposition, else from the last URL path segment. */
export function fileNameOf(url, disposition) {
    if (disposition) {
        const star = /filename\*\s*=\s*(?:[\w-]+'[^']*')?([^;]+)/i.exec(disposition);
        if (star) {
            try {
                return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
            } catch { /* fall through */ }
        }
        const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition);
        if (plain) return plain[1].trim();
    }
    const last = new URL(url).pathname.split('/').filter(Boolean).pop();
    if (!last) return null;
    try {
        return decodeURIComponent(last);
    } catch {
        return last;
    }
}

/** GET an image and follow up to 10 redirects. Throws FetchError for HTTP errors, non-image bodies and files over the cap. */
export async function downloadImage(url, { fetchImpl = fetch, timeoutMs = 60000, maxBytes = 25 * 1048576, token } = {}) {
    let current = url;
    const signal = AbortSignal.timeout(timeoutMs);
    for (let hop = 0; ; hop++) {
        let res;
        try {
            res = await fetchImpl(current, {
                redirect: 'manual',
                signal,
                headers: { 'user-agent': USER_AGENT, accept: ACCEPT, ...authHeaders(current, token) },
            });
        } catch (err) {
            const reason = err.name === 'TimeoutError' ? 'Timed out' : (err.cause?.code ?? err.cause?.message ?? err.message);
            throw new FetchError(reason);
        }
        const location = res.headers.get('location');
        if (res.status >= 300 && res.status < 400 && location) {
            res.body?.cancel?.().catch(() => {});
            if (hop + 1 > MAX_REDIRECTS) throw new FetchError('Too many redirects', { statusCode: res.status });
            try {
                current = new URL(location, current).href;
            } catch {
                throw new FetchError(`Invalid redirect location: ${location}`, { statusCode: res.status });
            }
            continue;
        }
        if (res.status >= 400) {
            res.body?.cancel?.().catch(() => {});
            const hint = res.status === 401 || res.status === 403 ? ' (access denied: the file is private or the site blocks automated downloads)' : '';
            throw new FetchError(`HTTP ${res.status}${hint}`, { statusCode: res.status });
        }
        const declared = Number(res.headers.get('content-length'));
        if (declared > maxBytes) {
            res.body?.cancel?.().catch(() => {});
            throw new FetchError(`File is larger than ${Math.round(maxBytes / 1048576)} MB (raise maxFileSizeMb to convert it)`, { statusCode: res.status });
        }
        const contentType = res.headers.get('content-type') ?? '';
        let buffer;
        try {
            buffer = await readLimited(res, maxBytes);
        } catch (err) {
            if (err instanceof FetchError) throw err;
            throw new FetchError(err.name === 'TimeoutError' ? 'Timed out' : err.message);
        }
        const type = sniffImage(buffer);
        if (!type) {
            const what = /html/i.test(contentType) ? 'a web page' : (contentType.split(';')[0] || 'unknown content');
            throw new FetchError(`Not an image (got ${what})`, { statusCode: res.status });
        }
        return {
            url: current,
            statusCode: res.status,
            contentType,
            type,
            fileName: fileNameOf(current, res.headers.get('content-disposition')),
            buffer,
        };
    }
}
