// Client for the Tranco research list (https://tranco-list.eu), a public, daily ranking of the
// top 1 million sites built from Chrome UX Report, Cloudflare Radar, Cisco Umbrella, Majestic and
// Farsight data. Free to use with attribution.

import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';

export const TRANCO = 'https://tranco-list.eu';
const USER_AGENT = 'pampa-data-website-popularity-rank/0.1 (+https://apify.com/pampa-data)';

export class HttpError extends Error {
    constructor(status, url) {
        super(`HTTP ${status} for ${url}`);
        this.status = status;
    }
}

async function getJson(url, fetchImpl) {
    const res = await fetchImpl(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' } });
    if (!res.ok) throw new HttpError(res.status, url);
    return res.json();
}

/** Metadata of the latest daily list: { listId, createdOn, downloadUrl }. */
export async function getLatestList(fetchImpl = fetch) {
    const d = await getJson(`${TRANCO}/api/lists/date/latest`, fetchImpl);
    if (!d?.list_id || !d.available) throw new Error('Tranco has no list available right now.');
    return {
        listId: d.list_id,
        createdOn: d.created_on?.slice(0, 10) ?? null,
        downloadUrl: d.download ?? `${TRANCO}/download/${d.list_id}/1000000`,
    };
}

/**
 * Streams a "rank,domain" CSV and keeps only the domains in `wanted`, so memory stays small
 * however long the list is. `lines` is any async iterable of lines.
 */
export async function ranksFromLines(lines, wanted) {
    const found = new Map();
    for await (const line of lines) {
        const comma = line.indexOf(',');
        if (comma < 1) continue;
        const domain = line.slice(comma + 1).trim().toLowerCase();
        if (!wanted.has(domain)) continue;
        found.set(domain, Number(line.slice(0, comma)));
        if (found.size === wanted.size) break;
    }
    return found;
}

export async function downloadRanks(downloadUrl, wanted, fetchImpl = fetch) {
    const res = await fetchImpl(downloadUrl, { headers: { 'user-agent': USER_AGENT } });
    if (!res.ok) throw new HttpError(res.status, downloadUrl);
    const lines = createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity });
    try {
        return await ranksFromLines(lines, wanted);
    } finally {
        lines.close();
        res.body.cancel?.().catch(() => {});
    }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Daily rank history for about the last month from the Tranco ranks API, oldest first.
 * The API allows about one request per second, so calls go through a shared limiter.
 */
export class HistoryClient {
    constructor({ fetchImpl = fetch, minIntervalMs = 1100, maxRetries = 4, sleepImpl = sleep } = {}) {
        this.fetchImpl = fetchImpl;
        this.minIntervalMs = minIntervalMs;
        this.maxRetries = maxRetries;
        this.sleep = sleepImpl;
        this.queue = Promise.resolve();
        this.last = 0;
    }

    async #slot() {
        const prev = this.queue;
        let release;
        this.queue = new Promise((r) => { release = r; });
        await prev;
        const wait = this.last + this.minIntervalMs - Date.now();
        if (wait > 0) await this.sleep(wait);
        this.last = Date.now();
        release();
    }

    async history(domain) {
        const url = `${TRANCO}/api/ranks/domain/${encodeURIComponent(domain)}`;
        for (let attempt = 0; ; attempt++) {
            await this.#slot();
            try {
                const d = await getJson(url, this.fetchImpl);
                return (d.ranks ?? [])
                    .map((r) => ({ date: r.date, rank: r.rank }))
                    .sort((a, b) => a.date.localeCompare(b.date));
            } catch (err) {
                const retryable = !(err instanceof HttpError) || err.status === 429 || err.status >= 500;
                if (!retryable || attempt >= this.maxRetries) throw err;
                await this.sleep(2000 * 2 ** attempt);
            }
        }
    }
}

export function tierOf(rank) {
    if (!rank) return 'Not in top 1M';
    if (rank <= 100) return 'Top 100';
    if (rank <= 1000) return 'Top 1K';
    if (rank <= 10000) return 'Top 10K';
    if (rank <= 100000) return 'Top 100K';
    return 'Top 1M';
}

/**
 * Summary of a history (oldest first). Rank changes are "places gained": positive means the site
 * moved up (a smaller rank number), negative means it dropped.
 */
export function summarizeHistory(history) {
    if (!history?.length) {
        return { daysRanked: 0, bestRank: null, worstRank: null, averageRank: null, change7d: null, change30d: null, trend: null };
    }
    const ranks = history.map((h) => h.rank);
    const latest = history.at(-1);
    const ago = (days) => {
        const target = new Date(Date.parse(latest.date) - days * 86400000).toISOString().slice(0, 10);
        const past = history.filter((h) => h.date <= target).at(-1);
        return past ? past.rank - latest.rank : null;
    };
    const change7d = ago(7);
    const change30d = ago(30) ?? history[0].rank - latest.rank;
    const ref = change7d ?? change30d;
    // Relative move of at least 5% counts as a trend; small rank jitter is "stable".
    const relative = ref / latest.rank;
    const trend = relative >= 0.05 ? 'rising' : relative <= -0.05 ? 'falling' : 'stable';
    return {
        daysRanked: history.length,
        bestRank: Math.min(...ranks),
        worstRank: Math.max(...ranks),
        averageRank: Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length),
        change7d,
        change30d,
        trend,
    };
}
