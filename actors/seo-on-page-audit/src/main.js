import { Actor, log } from 'apify';

import { auditPage, isHtmlResponse, summarize } from './audit.js';
import { FetchError, HostLimiter, bodyText, fetchUrl } from './fetch.js';
import { InputError, normalizeInput } from './input.js';
import { isAllowed, parseRobots } from './robots.js';
import { collectSitemapUrls } from './sitemap.js';

// Answers that usually mean "blocked" or "try later" rather than a real page status: reported as failed, not charged.
const NOT_CHARGED_STATUSES = new Set([401, 403, 407, 429, 503, 999]);
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

await Actor.init();

let input;
try {
    input = normalizeInput((await Actor.getInput()) ?? {});
} catch (err) {
    if (err instanceof InputError) await Actor.fail(`Invalid input: ${err.message}`);
    throw err;
}

const failures = input.invalid.map((value) => ({ input: value, error: 'Not a valid public web address' }));
if (failures.length) log.warning(`Skipping ${failures.length} value(s) that are not web addresses: ${input.invalid.slice(0, 5).join(', ')}`);

const robotsCache = new Map();
function getRobots(origin) {
    if (!robotsCache.has(origin)) {
        robotsCache.set(origin, fetchUrl(`${origin}/robots.txt`, { accept: 'text/plain,*/*;q=0.5', maxBytes: 512 * 1024, timeoutMs: 15000 })
            .then((res) => (res.statusCode === 200 ? { text: bodyText(res) } : { text: '' }))
            .catch(() => null));
    }
    return robotsCache.get(origin);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Build the page list: explicit URLs first, then sitemap URLs, deduplicated, up to maxPages.
const pageList = [];
const seen = new Set();
const addPage = (url) => {
    if (pageList.length >= input.maxPages || seen.has(url)) return;
    seen.add(url);
    pageList.push(url);
};
input.pages.forEach(addPage);
if (input.pages.length > input.maxPages) log.warning(`Only the first ${input.maxPages} URLs are audited (maxPages).`);
if (input.sitemaps.length && pageList.length < input.maxPages) {
    log.info(`Reading sitemaps of ${input.sitemaps.length} website(s)...`);
    const { urls, errors } = await collectSitemapUrls(input.sitemaps, {
        limit: input.maxPages - pageList.length,
        filter: input.urlFilter,
        getRobots,
        log: (m) => log.info(m),
    });
    urls.forEach(addPage);
    failures.push(...errors);
}
if (pageList.length === 0) {
    if (failures.length) await Actor.setValue('FAILED', failures);
    await Actor.fail('No pages to audit: the sitemaps had no URLs (see the FAILED record).');
}
log.info(`Auditing ${pageList.length} page(s)...`);

const limiter = new HostLimiter(3);
const summaryRows = [];
let chargeLimitReached = false;
let saved = 0;
let done = 0;

async function fetchWithRetry(url) {
    for (let attempt = 0; ; attempt++) {
        try {
            const res = await fetchUrl(url);
            if (RETRY_STATUSES.has(res.statusCode) && attempt < 2) {
                await sleep(2000 * 2 ** attempt);
                continue;
            }
            return res;
        } catch (err) {
            if (attempt < 1 && !/redirect/i.test(err.message)) {
                await sleep(2000);
                continue;
            }
            throw err;
        }
    }
}

async function auditOne(url) {
    const host = new URL(url).host;
    let item;
    try {
        const response = await limiter.run(host, () => fetchWithRetry(url));
        if (NOT_CHARGED_STATUSES.has(response.statusCode)) {
            throw new FetchError(`HTTP ${response.statusCode} (blocked or temporarily unavailable)`, { statusCode: response.statusCode, redirectChain: response.redirectChain });
        }
        // Images, PDFs and videos listed in sitemaps (WordPress attachment pages redirect to the file) are not web pages.
        if (response.statusCode < 400 && !isHtmlResponse(response)) {
            throw new FetchError(`Not an HTML page (${response.contentType.split(';')[0] || 'unknown type'})`, { statusCode: response.statusCode, redirectChain: response.redirectChain });
        }
        let robotsTxtAllowed = null;
        if (input.checkRobotsTxt) {
            const robots = await getRobots(new URL(response.url).origin);
            if (robots) robotsTxtAllowed = isAllowed(parseRobots(robots.text), response.url, 'googlebot');
        }
        item = auditPage(response, { robotsTxtAllowed, includeLinks: input.includeLinks, includeHeadings: input.includeHeadings });
    } catch (err) {
        if (!err.message.startsWith('Not an HTML page')) log.warning(`${url}: ${err.message}`);
        failures.push({ url, statusCode: err.statusCode ?? null, redirectChain: err.redirectChain ?? [], error: err.message });
        return;
    } finally {
        done++;
        if (done % 100 === 0) log.info(`Audited ${done}/${pageList.length} pages.`);
    }
    if (chargeLimitReached) return;
    const res = await Actor.pushData(item);
    saved++;
    summaryRows.push({
        finalUrl: item.finalUrl, title: item.title, metaDescription: item.metaDescription,
        indexable: item.indexable, issues: item.issues, responseTimeMs: item.responseTimeMs,
    });
    if (res?.eventChargeLimitReached) {
        chargeLimitReached = true;
        log.warning('Reached the maximum cost you set for this run. Stopping early; the pages audited so far are saved.');
    }
}

const queue = [...pageList];
await Promise.all(Array.from({ length: Math.min(input.maxConcurrency, queue.length) }, async () => {
    while (queue.length && !chargeLimitReached) await auditOne(queue.shift());
}));

await Actor.setValue('SUMMARY', summarize(summaryRows));
if (failures.length) await Actor.setValue('FAILED', failures);
log.info(`Done: ${saved} page(s) audited, ${failures.length} failed or skipped (not charged). See the SUMMARY record for issue counts and duplicate titles.`);
await Actor.exit();
