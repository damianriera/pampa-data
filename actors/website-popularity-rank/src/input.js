import { parse } from 'tldts';

export class InputError extends Error {}

export const MAX_DOMAINS = 10000;

/**
 * Turns "https://www.Example.co.uk/path?x=1" into the registrable domain "example.co.uk".
 * Tranco ranks pay-level domains, so subdomains are looked up by their registrable domain.
 * Returns null when the value is not a public domain.
 */
export function toDomain(value) {
    if (typeof value !== 'string') return null;
    let s = value.trim().toLowerCase();
    if (!s) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = `http://${s}`;
    let hostname;
    try {
        hostname = new URL(s).hostname;
    } catch {
        return null;
    }
    const info = parse(hostname);
    if (!info.domain || info.isIp || !info.isIcann) return null;
    return { domain: info.domain, hostname };
}

export function normalizeInput(raw = {}) {
    const values = [];
    for (const key of ['domains', 'urls']) {
        const v = raw[key];
        if (v == null) continue;
        if (!Array.isArray(v)) throw new InputError(`"${key}" must be a list.`);
        for (const item of v) {
            // Accept plain strings and the { url } objects Apify's requestListSources editor produces.
            values.push(typeof item === 'object' && item ? item.url : item);
        }
    }
    if (values.length === 0) throw new InputError('Add at least one domain or URL to "domains".');

    const targets = [];
    const invalid = [];
    const seen = new Set();
    for (const value of values) {
        const parsed = toDomain(value);
        if (!parsed) {
            invalid.push(String(value));
            continue;
        }
        if (seen.has(parsed.domain)) continue;
        seen.add(parsed.domain);
        targets.push({ input: String(value).trim(), ...parsed });
    }
    if (targets.length > MAX_DOMAINS) {
        throw new InputError(`At most ${MAX_DOMAINS} domains per run (got ${targets.length}). Split them into several runs.`);
    }

    const bool = (v, d) => (v === undefined || v === null ? d : Boolean(v));
    const maxConcurrency = Number(raw.maxConcurrency ?? 5);
    if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1 || maxConcurrency > 20) {
        throw new InputError('"maxConcurrency" must be a whole number from 1 to 20.');
    }

    return {
        targets,
        invalid,
        includeHistory: bool(raw.includeHistory, true),
        includeSiteInfo: bool(raw.includeSiteInfo, false),
        maxConcurrency,
    };
}
