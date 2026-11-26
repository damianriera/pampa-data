export class InputError extends Error {}

export const MAX_URLS = 10000;
export const OUTPUT_FORMATS = ['webp', 'avif', 'jpeg', 'png', 'original'];
export const FITS = ['inside', 'cover', 'contain', 'fill', 'outside'];

/** "example.com/a.png" -> URL. Returns null for values that are not public web addresses. */
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

/** "#fff", "#ffffff" or "white"-free hex only, so the value is predictable. */
export function parseColor(value) {
    const s = String(value ?? '#ffffff').trim();
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
    if (!m) throw new InputError('"background" must be a hex color like #ffffff.');
    const hex = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    return `#${hex.toLowerCase()}`;
}

/** Key-value store keys allow letters, digits and !-_.'() only. */
export function cleanPrefix(value) {
    const s = String(value ?? '').trim();
    if (!s) return '';
    if (!/^[a-zA-Z0-9!\-_.'()]{1,100}$/.test(s)) {
        throw new InputError('"keyPrefix" may only use letters, digits and ! - _ . \' ( ), up to 100 characters.');
    }
    return s;
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
    const values = listOf(raw, ['urls', 'startUrls', 'imageUrls']);
    if (values.length === 0) throw new InputError('Add at least one image URL to "urls".');

    const int = (name, d, min, max) => {
        const v = raw[name];
        if (v === undefined || v === null || v === '') return d;
        const n = Number(v);
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
    if (urls.length > MAX_URLS) throw new InputError(`At most ${MAX_URLS} images per run (got ${urls.length}). Split them into several runs.`);

    const format = String(raw.format ?? 'webp').toLowerCase().replace(/^jpg$/, 'jpeg');
    if (!OUTPUT_FORMATS.includes(format)) throw new InputError(`"format" must be one of: ${OUTPUT_FORMATS.join(', ')}.`);
    const fit = String(raw.fit ?? 'inside').toLowerCase();
    if (!FITS.includes(fit)) throw new InputError(`"fit" must be one of: ${FITS.join(', ')}.`);

    const storeName = raw.keyValueStoreName == null ? '' : String(raw.keyValueStoreName).trim();
    if (storeName && !/^[a-zA-Z0-9-]{1,63}$/.test(storeName)) {
        throw new InputError('"keyValueStoreName" may only use letters, digits and "-", up to 63 characters.');
    }

    return {
        urls,
        invalid,
        format,
        width: int('width', null, 1, 10000),
        height: int('height', null, 1, 10000),
        fit,
        withoutEnlargement: bool(raw.withoutEnlargement, true),
        quality: int('quality', 80, 1, 100),
        lossless: bool(raw.lossless, false),
        keepMetadata: bool(raw.keepMetadata, false),
        keepAnimation: bool(raw.keepAnimation, false),
        background: parseColor(raw.background),
        keyPrefix: cleanPrefix(raw.keyPrefix),
        keyValueStoreName: storeName,
        maxFileSizeMb: int('maxFileSizeMb', 25, 1, 100),
        maxMegapixels: int('maxMegapixels', 40, 1, 100),
        maxConcurrency: int('maxConcurrency', 4, 1, 10),
    };
}
