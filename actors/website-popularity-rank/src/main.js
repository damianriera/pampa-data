import { Actor, log } from 'apify';

import { InputError, normalizeInput } from './input.js';
import { fetchSiteInfo } from './site.js';
import { HistoryClient, downloadRanks, getLatestList, summarizeHistory, tierOf } from './tranco.js';

await Actor.init();

let input;
try {
    input = normalizeInput((await Actor.getInput()) ?? {});
} catch (err) {
    if (err instanceof InputError) await Actor.fail(`Invalid input: ${err.message}`);
    throw err;
}

const failures = input.invalid.map((value) => ({ input: value, error: 'Not a valid public domain or URL' }));
if (failures.length) log.warning(`Skipping ${failures.length} value(s) that are not valid domains: ${input.invalid.slice(0, 5).join(', ')}`);

log.info(`Looking up ${input.targets.length} domain(s) in the latest Tranco top 1M list...`);
const list = await getLatestList();
const wanted = new Set(input.targets.map((t) => t.domain));
const ranks = await downloadRanks(list.downloadUrl, wanted);
log.info(`Tranco list ${list.listId} (${list.createdOn}): ${ranks.size} of ${wanted.size} domain(s) are in the top 1M.`);

const history = new HistoryClient();
let chargeLimitReached = false;
let done = 0;

async function processTarget(target) {
    const rank = ranks.get(target.domain) ?? null;
    const item = {
        domain: target.domain,
        input: target.input,
        rank,
        inTop1M: rank !== null,
        tier: tierOf(rank),
        listDate: list.createdOn,
        listId: list.listId,
        trancoUrl: `https://tranco-list.eu/query?domain=${encodeURIComponent(target.domain)}`,
    };

    if (input.includeHistory) {
        if (rank === null) {
            item.history = [];
            Object.assign(item, summarizeHistory([]));
        } else {
            try {
                item.history = await history.history(target.domain);
                Object.assign(item, summarizeHistory(item.history));
            } catch (err) {
                log.warning(`History for ${target.domain} failed: ${err.message}`);
                item.history = null;
                item.historyError = err.message;
            }
        }
    }

    if (input.includeSiteInfo) item.site = await fetchSiteInfo(target.hostname);

    if (chargeLimitReached) return;
    const result = await Actor.pushData(item);
    if (result?.eventChargeLimitReached) {
        chargeLimitReached = true;
        log.warning('Reached the maximum cost you set for this run. Stopping early; the data collected so far is saved.');
    }
    done++;
    if (done % 50 === 0) log.info(`Processed ${done}/${input.targets.length} domains.`);
}

// History calls are rate-limited inside HistoryClient; this pool mostly parallelises homepage checks.
const queue = [...input.targets];
await Promise.all(Array.from({ length: input.maxConcurrency }, async () => {
    while (queue.length && !chargeLimitReached) await processTarget(queue.shift());
}));

if (failures.length) await Actor.setValue('FAILED', failures);
log.info(`Done: ${done} domain(s) saved. Data source: Tranco (tranco-list.eu), list ${list.listId}.`);
await Actor.exit();
