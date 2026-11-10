// Optional homepage check: status, final URL after redirects, title, description and language.

const USER_AGENT = 'Mozilla/5.0 (compatible; pampa-data-website-popularity-rank/0.1; +https://apify.com/pampa-data)';
const MAX_BYTES = 512 * 1024;

const decode = (s) => s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ').trim();

function metaContent(html, attr, value) {
    const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
    for (const tag of tags) {
        const a = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, 'i'));
        if (a && a[1].toLowerCase() === value) {
            const c = tag.match(/content\s*=\s*("([^"]*)"|'([^']*)')/i);
            if (c) return decode(c[2] ?? c[3] ?? '');
        }
    }
    return null;
}

export function parseHomepage(html) {
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const lang = html.match(/<html\b[^>]*\blang\s*=\s*["']?([a-zA-Z-]+)/i);
    return {
        title: title ? decode(title[1]) || null : null,
        description: metaContent(html, 'name', 'description') ?? metaContent(html, 'property', 'og:description'),
        language: lang ? lang[1] : null,
    };
}

async function readLimited(res) {
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    while (size < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
    }
    reader.cancel().catch(() => {});
    return Buffer.concat(chunks).toString('utf8');
}

export async function fetchSiteInfo(hostname, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
    const started = Date.now();
    for (const scheme of ['https', 'http']) {
        try {
            const res = await fetchImpl(`${scheme}://${hostname}/`, {
                redirect: 'follow',
                signal: AbortSignal.timeout(timeoutMs),
                headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*;q=0.8' },
            });
            const type = res.headers.get('content-type') ?? '';
            const html = type.includes('html') ? await readLimited(res) : '';
            if (!html) res.body?.cancel?.().catch(() => {});
            return {
                reachable: true,
                statusCode: res.status,
                finalUrl: res.url || `${scheme}://${hostname}/`,
                https: (res.url || '').startsWith('https://'),
                server: res.headers.get('server'),
                responseTimeMs: Date.now() - started,
                ...parseHomepage(html),
                error: null,
            };
        } catch (err) {
            if (scheme === 'http') {
                return {
                    reachable: false, statusCode: null, finalUrl: null, https: null, server: null,
                    responseTimeMs: null, title: null, description: null, language: null,
                    error: err.name === 'TimeoutError' ? 'Timed out' : (err.cause?.code ?? err.message),
                };
            }
        }
    }
    return null;
}
