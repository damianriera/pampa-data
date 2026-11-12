export class InputError extends Error {}

export const MAX_COMPANIES = 500;
export const ATS_LIST = ['greenhouse', 'lever', 'ashby', 'workday'];
const SLUG = /^[a-z0-9][a-z0-9._-]*$/i;

/**
 * Turns a career page URL, "ats:slug" or a bare company slug into a board reference.
 * Returns null when the value cannot be a board.
 */
export function parseBoard(value) {
    if (typeof value !== 'string') return null;
    const raw = value.trim();
    if (!raw) return null;

    const prefixed = raw.match(/^(greenhouse|lever|ashby):\s*([^\s/]+)$/i);
    if (prefixed) {
        return SLUG.test(prefixed[2]) ? { input: raw, ats: prefixed[1].toLowerCase(), slug: prefixed[2] } : null;
    }
    if (!raw.includes('.') && !raw.includes('/')) {
        return SLUG.test(raw) ? { input: raw, ats: 'auto', slug: raw.toLowerCase() } : null;
    }

    let url;
    try {
        url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
        return null;
    }
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    const first = parts[0];

    if (/(^|\.)greenhouse\.io$/.test(host)) {
        const slug = url.searchParams.get('for') ?? (first === 'embed' ? null : first);
        return slug && SLUG.test(slug) ? { input: raw, ats: 'greenhouse', slug } : null;
    }
    if (host === 'jobs.lever.co' || host === 'jobs.eu.lever.co') {
        return first && SLUG.test(first) ? { input: raw, ats: 'lever', slug: first, region: host.includes('.eu.') ? 'eu' : 'global' } : null;
    }
    if (host === 'jobs.ashbyhq.com') {
        return first && SLUG.test(first) ? { input: raw, ats: 'ashby', slug: decodeURIComponent(first) } : null;
    }
    const wd = host.match(/^([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com$/);
    if (wd) {
        const rest = /^[a-z]{2}-[a-z]{2}$/i.test(first ?? '') ? parts.slice(1) : parts;
        const site = rest[0];
        if (!site || site === 'job') return null;
        return { input: raw, ats: 'workday', host, tenant: wd[1], site, lang: rest === parts ? null : first, slug: `${wd[1]}/${site}` };
    }
    return null;
}

const list = (raw, key) => {
    const v = raw[key];
    if (v == null) return [];
    if (!Array.isArray(v)) throw new InputError(`"${key}" must be a list.`);
    return v.map((x) => (typeof x === 'object' && x ? x.url : x)).filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
};

export function normalizeInput(raw = {}) {
    const values = list(raw, 'companies');
    if (!values.length) throw new InputError('Add at least one company career page or board name to "companies".');

    const boards = [];
    const invalid = [];
    const seen = new Set();
    for (const value of values) {
        const board = parseBoard(value);
        if (!board) {
            invalid.push(value);
            continue;
        }
        const key = `${board.ats}:${board.slug.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        boards.push(board);
    }
    if (boards.length > MAX_COMPANIES) throw new InputError(`At most ${MAX_COMPANIES} companies per run (got ${boards.length}).`);

    const int = (key, def, min, max) => {
        const v = raw[key] ?? def;
        if (v === null) return null;
        const n = Number(v);
        if (!Number.isInteger(n) || n < min || n > max) throw new InputError(`"${key}" must be a whole number from ${min} to ${max}.`);
        return n;
    };
    const postedWithinDays = int('postedWithinDays', null, 0, 3650);
    const maxJobsPerCompany = int('maxJobsPerCompany', 0, 0, 100000);

    return {
        boards,
        invalid,
        keywords: list(raw, 'keywords').map((k) => k.toLowerCase()),
        excludeKeywords: list(raw, 'excludeKeywords').map((k) => k.toLowerCase()),
        locations: list(raw, 'locations').map((k) => k.toLowerCase()),
        remoteOnly: Boolean(raw.remoteOnly ?? false),
        postedWithinDays: postedWithinDays === 0 ? null : postedWithinDays,
        maxJobsPerCompany: maxJobsPerCompany || Infinity,
        includeDescription: Boolean(raw.includeDescription ?? false),
    };
}
