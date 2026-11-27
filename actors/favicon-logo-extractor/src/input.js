export class InputError extends Error {}

export const MAX_WEBSITES = 5000;

/** "Example.com/shop" -> URL("https://example.com/shop"). Returns null for values that are not public web addresses. */
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

export const DOWNLOAD_MODES = ['none', 'best', 'all'];

export function normalizeInput(raw = {}) {
    const values = [];
    for (const key of ['websites', 'urls', 'domains', 'startUrls']) {
        const v = raw[key];
        if (v == null) continue;
        if (!Array.isArray(v)) throw new InputError(`"${key}" must be a list.`);
        for (const item of v) values.push(typeof item === 'object' && item ? item.url : item);
    }
    if (values.length === 0) throw new InputError('Add at least one website to "websites".');

    const targets = [];
    const invalid = [];
    const seen = new Set();
    for (const value of values) {
        const url = toUrl(value);
        if (!url) {
            invalid.push(String(value));
            continue;
        }
        const key = url.href.replace(/\/$/, '').toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        targets.push({ input: String(value).trim(), url: url.href, hostname: url.hostname });
    }
    if (targets.length > MAX_WEBSITES) {
        throw new InputError(`At most ${MAX_WEBSITES} websites per run (got ${targets.length}). Split them into several runs.`);
    }

    const int = (name, d, min, max) => {
        const n = Number(raw[name] ?? d);
        if (!Number.isInteger(n) || n < min || n > max) throw new InputError(`"${name}" must be a whole number from ${min} to ${max}.`);
        return n;
    };
    const downloadImages = raw.downloadImages ?? 'none';
    if (!DOWNLOAD_MODES.includes(downloadImages)) {
        throw new InputError(`"downloadImages" must be one of: ${DOWNLOAD_MODES.join(', ')}.`);
    }

    return {
        targets,
        invalid,
        downloadImages,
        checkImages: raw.checkImages === undefined || raw.checkImages === null ? true : Boolean(raw.checkImages),
        includeHeaderSvg: raw.includeHeaderSvg === undefined || raw.includeHeaderSvg === null ? true : Boolean(raw.includeHeaderSvg),
        maxConcurrency: int('maxConcurrency', 5, 1, 20),
    };
}
