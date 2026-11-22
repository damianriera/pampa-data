// Apple's official iTunes Search and Lookup APIs.
// Docs: https://performance-partners.apple.com/search-api (about 20 calls per minute).

import { PLATFORMS } from './input.js';

const BASE = 'https://itunes.apple.com';
export const LOOKUP_BATCH = 100;

export class HttpError extends Error {
    constructor(status, url) {
        super(`HTTP ${status} for ${url.split('?')[0]}`);
        this.status = status;
    }
}

export function searchUrl(term, { country, platform, limit, language }) {
    const p = new URLSearchParams({ term, country, media: 'software', entity: PLATFORMS[platform], limit: String(limit) });
    if (language) p.set('lang', language);
    return `${BASE}/search?${p}`;
}

export function lookupUrl({ ids, bundleIds, developerId }, { country, language }) {
    const p = new URLSearchParams({ country });
    if (ids?.length) p.set('id', ids.join(','));
    if (bundleIds?.length) p.set('bundleId', bundleIds.join(','));
    if (developerId) {
        p.set('id', developerId);
        p.set('entity', 'software,macSoftware');
        p.set('limit', '200');
    }
    if (language) p.set('lang', language);
    return `${BASE}/lookup?${p}`;
}

/** Only app rows (developer lookups also return the developer itself as the first row). */
export function parseResults(text) {
    const data = JSON.parse(text);
    if (!Array.isArray(data?.results)) throw new Error('Unexpected answer from the App Store API.');
    return data.results.filter((r) => r.wrapperType === 'software' && r.trackId);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (compatible; pampa-data-app-store/0.1; +https://apify.com/pampa-data)';

async function defaultGet(url, timeoutMs) {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
    return { status: res.status, body: res.status === 200 ? await res.text() : '' };
}

/**
 * A client that keeps to Apple's documented pace (one call every `intervalMs`, default 3 s = 20 per minute)
 * and retries 403/429/5xx and network errors with exponential backoff. Apple answers a burst with 403.
 */
export function createClient({ intervalMs = 3000, retries = 4, backoffMs = 5000, timeoutMs = 30000, getImpl = defaultGet, sleepImpl = sleep, now = Date.now } = {}) {
    let nextSlot = 0;
    let chain = Promise.resolve();
    const waitTurn = () => {
        const turn = chain.then(async () => {
            const wait = nextSlot - now();
            if (wait > 0) await sleepImpl(wait);
            nextSlot = now() + intervalMs;
        });
        chain = turn.catch(() => {});
        return turn;
    };
    let requests = 0;

    async function getText(url) {
        let lastErr;
        for (let attempt = 0; attempt <= retries; attempt++) {
            if (attempt > 0) await sleepImpl(backoffMs * 2 ** (attempt - 1));
            await waitTurn();
            requests++;
            let res;
            try {
                res = await getImpl(url, timeoutMs);
            } catch (err) {
                lastErr = err;
                continue;
            }
            if (res.status === 200) return res.body;
            lastErr = new HttpError(res.status, url);
            if (![403, 429].includes(res.status) && res.status < 500) throw lastErr;
        }
        throw lastErr;
    }

    return {
        getText,
        get requests() { return requests; },
        search: async (term, opts) => parseResults(await getText(searchUrl(term, opts))),
        lookup: async (query, opts) => parseResults(await getText(lookupUrl(query, opts))),
    };
}
