import { Actor, log } from 'apify';

import { HostLimiter } from './fetch.js';
import { dedupKey, matchKeywords, passesDateFilter, passesFilters, sortNewestFirst } from './filter.js';
import { InputError, normalizeInput } from './input.js';
import { toRow } from './output.js';
import { materialize } from './parse.js';
import { readSource } from './reader.js';

await Actor.init();

let input;
try {
    input = normalizeInput((await Actor.getInput()) ?? {});
} catch (err) {
    if (err instanceof InputError) await Actor.fail(`Invalid input: ${err.message}`);
    throw err;
}

const failures = input.invalid.map((value) => ({ source: value, error: 'Not a valid public web address' }));
if (failures.length) log.warning(`Skipping ${failures.length} value(s) that are not web addresses: ${input.invalid.slice(0, 5).join(', ')}`);
if (input.since) log.info(`Only items published after ${input.since.toISOString()}.`);

const limiter = new HostLimiter(2);
const seenKeys = new Set();
const seenFeeds = new Set();
const feedsReport = [];
let reserved = 0;
let saved = 0;
let duplicates = 0;
let stop = false;

async function processSource(source) {
    let result;
    try {
        result = await limiter.run(new URL(source).host, () => readSource(source, { allFeedsPerWebsite: input.allFeedsPerWebsite }));
    } catch (err) {
        log.warning(`${source}: ${err.message}`);
        failures.push({ source, statusCode: err.statusCode ?? null, error: err.message });
        return;
    }
    for (const e of result.errors) failures.push({ source, feedUrl: e.url, error: e.error });

    for (const { feedUrl, feed, items } of result.feeds) {
        if (seenFeeds.has(feedUrl)) continue;
        seenFeeds.add(feedUrl);
        const rows = [];
        const sorted = sortNewestFirst(items);
        for (const item of sorted) {
            if (rows.length >= input.maxItemsPerFeed) break;
            if (!passesDateFilter(item, input)) continue;
            materialize(item);
            if (!passesFilters(item, input)) continue;
            if (!item.title && !item.link && !item.summary) continue;
            if (input.deduplicate) {
                const key = dedupKey(item);
                if (seenKeys.has(key)) {
                    duplicates++;
                    continue;
                }
                seenKeys.add(key);
            }
            rows.push(toRow(item, {
                feed, feedUrl, source,
                matchedKeywords: matchKeywords(item, input.keywords),
                content: input.content,
                summaryMaxLength: input.summaryMaxLength,
            }));
        }
        // Reserve room under maxItems before the await, so parallel feeds never overshoot.
        const room = Math.max(0, input.maxItems - reserved);
        const batch = stop ? [] : rows.slice(0, room);
        reserved += batch.length;
        feedsReport.push({
            source, feedUrl, discovered: result.discovered, feedType: feed.feedType, title: feed.title, link: feed.link,
            description: feed.description, language: feed.language, image: feed.image, lastUpdated: feed.lastUpdated,
            generator: feed.generator, itemsInFeed: items.length, itemsSaved: batch.length,
            newestItem: sorted[0]?.published ?? null,
        });
        if (!batch.length) continue;
        const res = await Actor.pushData(batch);
        const charged = res?.chargedCount ?? batch.length;
        saved += res?.eventChargeLimitReached ? charged : batch.length;
        if (res?.eventChargeLimitReached && !stop) {
            stop = true;
            log.warning('Reached the maximum cost you set for this run. Stopping early; the items saved so far are kept.');
        }
        if (reserved >= input.maxItems && !stop) {
            stop = true;
            log.info(`Reached maxItems (${input.maxItems}).`);
        }
    }
}

log.info(`Reading ${input.sources.length} feed(s) or website(s)...`);
const queue = [...input.sources];
let done = 0;
await Promise.all(Array.from({ length: Math.min(input.maxConcurrency, queue.length) }, async () => {
    while (queue.length && !stop) {
        await processSource(queue.shift());
        done++;
        if (done % 100 === 0) log.info(`Read ${done}/${input.sources.length} sources, ${saved} items saved.`);
    }
}));

await Actor.setValue('FEEDS', feedsReport);
if (failures.length) await Actor.setValue('FAILED', failures);
const dupNote = input.deduplicate && duplicates ? `, ${duplicates} duplicate(s) skipped` : '';
log.info(`Done: ${saved} item(s) saved from ${feedsReport.length} feed(s)${dupNote}; ${failures.length} source(s) failed (not charged, see the FAILED record).`);
if (saved === 0 && feedsReport.length === 0) {
    await Actor.fail('No feed could be read. See the FAILED record for the reason per URL.');
}
await Actor.exit();
