export class InputError extends Error {}

export const MAX_URLS = 10000;
export const TEXT_FORMATS = ['text', 'markdown'];

/** "example.com/file.pdf" -> URL. Returns null for values that are not public web addresses. */
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

/**
 * "1-3, 7, 10-" -> [{from:1,to:3},{from:7,to:7},{from:10,to:Infinity}]. Empty means every page.
 * "-5" means the first five pages.
 */
export function parsePageRange(value) {
    if (value == null) return [];
    const s = String(value).trim();
    if (!s) return [];
    const ranges = [];
    for (const part of s.split(/[,;]/).map((p) => p.trim()).filter(Boolean)) {
        const m = /^(\d*)\s*(?:(-|–|to|\.\.)\s*(\d*))?$/i.exec(part);
        if (!m || (!m[1] && !m[3])) throw new InputError(`"pageRange": "${part}" is not a page or range like 1-5, 8, 10-.`);
        const from = m[1] ? Number(m[1]) : 1;
        const to = m[2] ? (m[3] ? Number(m[3]) : Infinity) : from;
        if (from < 1 || to < from) throw new InputError(`"pageRange": "${part}" is not a valid range (pages start at 1).`);
        ranges.push({ from, to });
    }
    return ranges;
}

/** Page numbers (1-based) selected by the ranges, for a document of `total` pages. */
export function selectPages(ranges, total) {
    if (!ranges.length) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set();
    for (const { from, to } of ranges) {
        for (let p = from; p <= Math.min(to, total); p++) set.add(p);
    }
    return [...set].sort((a, b) => a - b);
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
    const values = listOf(raw, ['urls', 'startUrls', 'pdfUrls']);
    if (values.length === 0) throw new InputError('Add at least one PDF URL to "urls".');

    const int = (name, d, min, max) => {
        const n = Number(raw[name] ?? d);
        if (!Number.isInteger(n) || n < min || n > max) throw new InputError(`"${name}" must be a whole number from ${min} to ${max}.`);
        return n;
    };
    const bool = (v, d) => (v === undefined || v === null ? d : Boolean(v));

    const invalid = [];
    const urls = [];
    for (const value of values) {
        const url = toUrl(value);
        if (!url) invalid.push(String(value));
        else if (!urls.includes(url.href)) urls.push(url.href);
    }
    if (urls.length === 0) throw new InputError(`None of the values are web addresses: ${invalid.slice(0, 5).join(', ')}`);
    if (urls.length > MAX_URLS) throw new InputError(`At most ${MAX_URLS} PDFs per run (got ${urls.length}). Split them into several runs.`);

    const textFormat = String(raw.textFormat ?? 'text').toLowerCase();
    if (!TEXT_FORMATS.includes(textFormat)) throw new InputError(`"textFormat" must be one of: ${TEXT_FORMATS.join(', ')}.`);

    return {
        urls,
        invalid,
        textFormat,
        includePages: bool(raw.includePages, false),
        includeLinks: bool(raw.includeLinks, false),
        pageRanges: parsePageRange(raw.pageRange),
        maxPages: int('maxPages', 2000, 1, 10000),
        maxChars: int('maxChars', 0, 0, 50_000_000),
        maxFileSizeMb: int('maxFileSizeMb', 50, 1, 200),
        maxConcurrency: int('maxConcurrency', 4, 1, 20),
    };
}
