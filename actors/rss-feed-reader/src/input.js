import { parseSince } from './filter.js';

export class InputError extends Error {}

export const MAX_SOURCES = 5000;
export const MAX_ITEMS = 100000;
export const CONTENT_MODES = ['none', 'text', 'html'];

/** "Example.com/blog" -> URL("https://example.com/blog"). Returns null for values that are not public web addresses. */
export function toUrl(value) {
    if (typeof value !== 'string') return null;
    let s = value.trim();
    if (!s) return null;
    if (/^feed:/i.test(s)) s = s.replace(/^feed:(\/\/)?/i, '');
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

function words(raw, key) {
    const v = raw[key];
    if (v == null) return [];
    const list = Array.isArray(v) ? v : String(v).split(',');
    return [...new Set(list.map((s) => String(s ?? '').trim()).filter(Boolean))];
}

export function normalizeInput(raw = {}, now = new Date()) {
    const values = listOf(raw, ['urls', 'feedUrls', 'startUrls']);
    if (values.length === 0) throw new InputError('Add at least one feed URL or website to "urls".');

    const int = (name, d, min, max) => {
        const n = Number(raw[name] ?? d);
        if (!Number.isInteger(n) || n < min || n > max) throw new InputError(`"${name}" must be a whole number from ${min} to ${max}.`);
        return n;
    };
    const bool = (v, d) => (v === undefined || v === null ? d : Boolean(v));

    const invalid = [];
    const sources = [];
    for (const value of values) {
        const url = toUrl(value);
        if (!url) invalid.push(String(value));
        else if (!sources.includes(url.href)) sources.push(url.href);
    }
    if (sources.length === 0) throw new InputError(`None of the values are web addresses: ${invalid.slice(0, 5).join(', ')}`);
    if (sources.length > MAX_SOURCES) throw new InputError(`At most ${MAX_SOURCES} feeds or websites per run (got ${sources.length}). Split them into several runs.`);

    let since;
    try {
        since = parseSince(raw.publishedAfter, now);
    } catch (err) {
        throw new InputError(`"publishedAfter": ${err.message}.`);
    }

    const content = String(raw.content ?? 'none').toLowerCase();
    if (!CONTENT_MODES.includes(content)) throw new InputError(`"content" must be one of: ${CONTENT_MODES.join(', ')}.`);

    return {
        sources,
        invalid,
        maxItemsPerFeed: int('maxItemsPerFeed', 100, 1, 10000),
        maxItems: int('maxItems', 5000, 1, MAX_ITEMS),
        since,
        keywords: words(raw, 'keywords'),
        excludeKeywords: words(raw, 'excludeKeywords'),
        content,
        summaryMaxLength: int('summaryMaxLength', 500, 0, 100000),
        deduplicate: bool(raw.deduplicate, true),
        allFeedsPerWebsite: bool(raw.allFeedsPerWebsite, false),
        maxConcurrency: int('maxConcurrency', 10, 1, 50),
    };
}
