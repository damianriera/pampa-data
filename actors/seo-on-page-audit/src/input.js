export class InputError extends Error {}

export const MAX_PAGES = 10000;

/** "Example.com/blog" -> URL("https://example.com/blog"). Returns null for values that are not public web addresses. */
export function toUrl(value) {
    if (typeof value !== 'string') return null;
    let s = value.trim();
    if (!s) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
    let url;
    try {
        url = new URL(s);
    } catch {
        return null;
    }
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname;
    if (!host.includes('.') || host.endsWith('.') || /^[\d.]+$/.test(host) || host.startsWith('[')) return null;
    if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return null;
    url.hash = '';
    return url;
}

function listOf(raw, keys) {
    const values = [];
    for (const key of keys) {
        const v = raw[key];
        if (v == null) continue;
        if (!Array.isArray(v)) throw new InputError(`"${key}" must be a list.`);
        for (const item of v) values.push(typeof item === 'object' && item ? item.url : item);
    }
    return values;
}

export function normalizeInput(raw = {}) {
    const pageValues = listOf(raw, ['urls', 'startUrls', 'websites']);
    const sitemapValues = listOf(raw, ['sitemapUrls', 'sitemaps']);
    if (pageValues.length === 0 && sitemapValues.length === 0) {
        throw new InputError('Add at least one page to "urls" or one website or sitemap to "sitemapUrls".');
    }

    const int = (name, d, min, max) => {
        const n = Number(raw[name] ?? d);
        if (!Number.isInteger(n) || n < min || n > max) throw new InputError(`"${name}" must be a whole number from ${min} to ${max}.`);
        return n;
    };
    const bool = (v, d) => (v === undefined || v === null ? d : Boolean(v));

    const invalid = [];
    const pages = [];
    for (const value of pageValues) {
        const url = toUrl(value);
        if (url) pages.push(url.href);
        else invalid.push(String(value));
    }
    const sitemaps = [];
    for (const value of sitemapValues) {
        const url = toUrl(value);
        if (url) sitemaps.push(url.href);
        else invalid.push(String(value));
    }
    if (pages.length === 0 && sitemaps.length === 0) throw new InputError(`None of the values are web addresses: ${invalid.slice(0, 5).join(', ')}`);

    const maxPages = int('maxPages', 1000, 1, MAX_PAGES);
    if (pages.length > MAX_PAGES) {
        throw new InputError(`At most ${MAX_PAGES} pages per run (got ${pages.length}). Split them into several runs.`);
    }

    let urlFilter = null;
    if (raw.sitemapUrlFilter != null && String(raw.sitemapUrlFilter).trim()) {
        try {
            urlFilter = new RegExp(String(raw.sitemapUrlFilter).trim(), 'i');
        } catch {
            throw new InputError('"sitemapUrlFilter" is not a valid regular expression.');
        }
    }

    return {
        pages,
        sitemaps,
        invalid,
        maxPages,
        urlFilter,
        checkRobotsTxt: bool(raw.checkRobotsTxt, true),
        includeLinks: bool(raw.includeLinks, false),
        includeHeadings: bool(raw.includeHeadings, true),
        maxConcurrency: int('maxConcurrency', 10, 1, 30),
    };
}
