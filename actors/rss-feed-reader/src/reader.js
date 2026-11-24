// Reads one input (a feed URL or a website) and returns the parsed feeds behind it.
import { commonFeedUrls, findFeedLinks } from './discover.js';
import { FetchError, bodyText, fetchUrl } from './fetch.js';
import { NotAFeedError, looksLikeHtml, parseFeed } from './parse.js';

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET with up to 2 retries on 429/5xx and one on network errors. */
export async function fetchWithRetry(url, { fetchImpl, retryDelayMs = 2000 } = {}) {
    for (let attempt = 0; ; attempt++) {
        try {
            const res = await fetchUrl(url, { fetchImpl });
            if (RETRY_STATUSES.has(res.statusCode) && attempt < 2) {
                await sleep(retryDelayMs * 2 ** attempt);
                continue;
            }
            return res;
        } catch (err) {
            if (attempt < 1 && !/redirect/i.test(err.message)) {
                await sleep(retryDelayMs);
                continue;
            }
            throw err;
        }
    }
}

async function getDocument(url, opts) {
    const res = await fetchWithRetry(url, opts);
    if (res.statusCode !== 200) throw new FetchError(`HTTP ${res.statusCode}`, { statusCode: res.statusCode });
    if (res.truncated) throw new FetchError('Feed is larger than 30 MB', { statusCode: res.statusCode });
    return { url: res.url, text: bodyText(res) };
}

async function tryFeed(url, opts) {
    const doc = await getDocument(url, opts);
    return { feedUrl: doc.url, ...parseFeed(doc.text, doc.url) };
}

/**
 * Returns { feeds: [{ feedUrl, feed, items }], errors: [{ url, error }], discovered: boolean }.
 * Throws FetchError/NotAFeedError when nothing usable was found.
 */
export async function readSource(sourceUrl, { allFeedsPerWebsite = false, fetchImpl, retryDelayMs, maxGuesses = 14 } = {}) {
    const opts = { fetchImpl, retryDelayMs };
    const doc = await getDocument(sourceUrl, opts);
    try {
        return { feeds: [{ feedUrl: doc.url, ...parseFeed(doc.text, doc.url) }], errors: [], discovered: false };
    } catch (err) {
        if (!(err instanceof NotAFeedError) || !looksLikeHtml(doc.text)) throw err;
    }

    // A web page: use the feeds it declares, else guess the usual paths.
    const errors = [];
    const feeds = [];
    const links = findFeedLinks(doc.text, doc.url);
    const declared = allFeedsPerWebsite ? links.filter((l) => !l.comments) : links.slice(0, 1);
    for (const link of declared) {
        try {
            feeds.push(await tryFeed(link.url, opts));
        } catch (err) {
            errors.push({ url: link.url, error: err.message });
        }
    }
    if (feeds.length) return { feeds, errors, discovered: true };

    for (const guess of commonFeedUrls(doc.url).slice(0, maxGuesses)) {
        try {
            const feed = await tryFeed(guess, opts);
            if (feed.items.length) return { feeds: [feed], errors, discovered: true };
        } catch { /* next guess */ }
    }
    throw new NotAFeedError(links.length
        ? `The page links ${links.length} feed(s) but none could be read (${errors.map((e) => e.error).join('; ')})`
        : 'No feed found: the page declares none and the usual feed paths (/feed, /rss.xml, /atom.xml, ...) did not answer with one');
}
