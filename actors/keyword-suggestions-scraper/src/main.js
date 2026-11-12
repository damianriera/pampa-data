import { Actor, log } from 'apify';

import { collectSuggestions } from './collect.js';
import { InputError, normalizeInput } from './input.js';
import { SOURCES } from './sources/index.js';

await Actor.init();

let input;
let proxyConfiguration;
try {
    const raw = (await Actor.getInput()) ?? {};
    input = normalizeInput(raw);
    if (raw.proxyConfiguration?.useApifyProxy || raw.proxyConfiguration?.proxyUrls?.length) {
        proxyConfiguration = await Actor.createProxyConfiguration(raw.proxyConfiguration);
    }
} catch (err) {
    if (err instanceof InputError) await Actor.fail(`Invalid input: ${err.message}`);
    throw err;
}

const http = proxyConfiguration ? { getProxyUrl: () => proxyConfiguration.newUrl(`s${Math.floor(Math.random() * 1e6)}`) } : {};
const tasks = input.keywords.flatMap((keyword) => input.sources.map((source) => ({ keyword, source })));
log.info(`Getting suggestions for ${input.keywords.length} keyword(s) from ${input.sources.map((s) => SOURCES[s].name).join(', ')}...`);

const scrapedAt = new Date().toISOString();
const summary = [];
const failures = [];
let chargeLimitReached = false;
let saved = 0;

async function processTask({ keyword, source }) {
    let result;
    try {
        result = await collectSuggestions(keyword, source, input, { http });
    } catch (err) {
        log.warning(`"${keyword}" on ${SOURCES[source].name}: ${err.message}`);
        failures.push({ keyword, source, error: err.message });
        return;
    }
    const entry = { keyword, source, queries: result.queries, failedQueries: result.failedQueries, suggestions: result.suggestions.length, saved: 0 };
    summary.push(entry);
    if (result.failedQueries) failures.push({ keyword, source, error: `${result.failedQueries} of ${result.queries} queries failed`, examples: result.errors.slice(0, 3) });
    const items = result.suggestions.map((s) => ({
        keyword,
        source,
        suggestion: s.suggestion,
        position: s.position,
        query: s.query,
        modifier: s.modifier,
        wordCount: s.suggestion.split(/\s+/).length,
        language: input.language,
        country: input.country,
        scrapedAt,
    }));
    for (let i = 0; i < items.length && !chargeLimitReached; i += 100) {
        const chunk = items.slice(i, i + 100);
        const res = await Actor.pushData(chunk);
        if (res?.eventChargeLimitReached) {
            chargeLimitReached = true;
            log.warning('Reached the maximum cost you set for this run. Stopping early; the suggestions collected so far are saved.');
        }
        saved += chunk.length;
        entry.saved += chunk.length;
    }
    log.info(`"${keyword}" on ${SOURCES[source].name}: ${result.suggestions.length} unique suggestion(s) from ${result.queries} quer${result.queries === 1 ? 'y' : 'ies'}.`);
}

const queue = [...tasks];
await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length && !chargeLimitReached) await processTask(queue.shift());
}));

await Actor.setValue('SUMMARY', summary);
if (failures.length) await Actor.setValue('FAILED', failures);
log.info(`Done: ${saved} suggestion(s) saved; ${failures.length} keyword/source pair(s) had failures (not charged).`);
await Actor.exit();
