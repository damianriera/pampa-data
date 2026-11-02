import { Actor, log } from 'apify';
import { BasicCrawler, sleep } from 'crawlee';
import { gotScraping } from 'got-scraping';
import { CookieJar } from 'tough-cookie';

import { InputError, normalizeInput } from './input.js';
import { BlockedError, TrendsClient, buildExploreUrl } from './trends.js';

await Actor.init();

let input;
try {
    input = normalizeInput((await Actor.getInput()) ?? {});
} catch (err) {
    if (err instanceof InputError) {
        await Actor.fail(`Invalid input: ${err.message}`);
    }
    throw err;
}

const proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfiguration);

const requests = input.mode === 'explore'
    ? input.termGroups.map((terms) => ({
        url: buildExploreUrl({ terms, ...input }),
        uniqueKey: `explore:${terms.join('|')}`,
        userData: { kind: 'explore', terms },
    }))
    : input.trendingGeos.map((geo) => ({
        url: `https://trends.google.com/trending/rss?geo=${geo}`,
        uniqueKey: `trending:${geo}`,
        userData: { kind: 'trending', geo },
    }));

// One cookie jar per proxy session: Google ties its NID cookie to the IP that received it.
const cookieJars = new Map();
function cookieJarFor(sessionId) {
    if (!cookieJars.has(sessionId)) cookieJars.set(sessionId, new CookieJar());
    return cookieJars.get(sessionId);
}

const failures = [];
let itemsPushed = 0;
let chargeLimitReached = false;

async function save(items) {
    if (chargeLimitReached) return;
    const result = await Actor.pushData(items);
    itemsPushed += Array.isArray(items) ? items.length : 1;
    if (result?.eventChargeLimitReached) {
        chargeLimitReached = true;
        log.warning('Reached the maximum cost you set for this run. Stopping early; the data collected so far is saved.');
        await crawler.stop?.();
    }
}

const crawler = new BasicCrawler({
    maxConcurrency: input.maxConcurrency,
    maxRequestRetries: input.maxRetries,
    requestHandlerTimeoutSecs: 180,
    useSessionPool: true,
    sessionPoolOptions: { maxPoolSize: 50, sessionOptions: { maxUsageCount: 30, maxErrorScore: 1 } },
    async requestHandler({ request, session }) {
        if (chargeLimitReached) return;

        // Back off a little more on each retry: Google throttles bursts.
        if (request.retryCount > 0) {
            const delay = Math.min(30_000, 1_000 * 2 ** request.retryCount) + Math.random() * 1_000;
            await sleep(delay);
        }

        const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl(session.id) : undefined;
        const cookieJar = cookieJarFor(session.id);
        const client = new TrendsClient({
            language: input.language,
            timezoneOffset: input.timezoneOffset,
            fetchText: async (url) => {
                const res = await gotScraping({
                    url,
                    proxyUrl,
                    cookieJar,
                    sessionToken: session,
                    throwHttpErrors: false,
                    timeout: { request: 30_000 },
                });
                return { statusCode: res.statusCode, body: res.body };
            },
        });

        try {
            if (!session.userData.warmedUp) {
                await client.warmUp(input.geo);
                session.userData.warmedUp = true;
            }

            if (request.userData.kind === 'explore') {
                const { terms } = request.userData;
                const data = await client.scrapeGroup(terms, input);
                await save({
                    type: 'explore',
                    searchTerms: terms,
                    geo: input.geo || 'WORLDWIDE',
                    timeRange: input.timeRange,
                    category: input.category,
                    searchProperty: input.searchProperty,
                    ...data,
                    exploreUrl: request.url,
                    scrapedAt: new Date().toISOString(),
                });
                log.info(`Scraped ${terms.map((t) => `"${t}"`).join(' vs ')}`);
            } else {
                const { geo } = request.userData;
                let items = await client.trendingNow(geo);
                if (input.maxTrendingItems) items = items.slice(0, input.maxTrendingItems);
                const scrapedAt = new Date().toISOString();
                if (items.length) await save(items.map((item) => ({ type: 'trendingNow', ...item, scrapedAt })));
                log.info(`Scraped ${items.length} trending searches for ${geo}`);
            }
        } catch (err) {
            if (err instanceof BlockedError) {
                cookieJars.delete(session.id);
                session.retire();
                log.debug(`Blocked (${err.message}); rotating session and retrying ${request.uniqueKey}`);
            }
            throw err;
        }
    },
    async failedRequestHandler({ request }, error) {
        const what = request.userData.kind === 'explore' ? request.userData.terms.join(', ') : request.userData.geo;
        failures.push({ target: what, error: error.message, retries: request.retryCount });
        log.error(`Giving up on "${what}" after ${request.retryCount} retries: ${error.message}`);
    },
});

await crawler.run(requests);

if (failures.length) {
    await Actor.setValue('FAILED', failures);
    log.warning(`${failures.length} of ${requests.length} targets failed. Details are in the key-value store record "FAILED". `
        + 'If Google keeps blocking, switch the proxy to the RESIDENTIAL group.');
}

const summary = `Saved ${itemsPushed} result(s); ${failures.length} target(s) failed.`;
if (itemsPushed === 0 && failures.length) {
    await Actor.fail(`No data could be scraped. ${failures[0].error}. Try the RESIDENTIAL proxy group.`);
} else {
    await Actor.exit(summary);
}
