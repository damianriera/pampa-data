import { Actor, log } from 'apify';

import { FetchError } from './fetch.js';
import { InputError, normalizeInput } from './input.js';
import { NothingFoundError, processWebsite } from './site.js';

await Actor.init();

let input;
try {
    input = normalizeInput((await Actor.getInput()) ?? {});
} catch (err) {
    if (err instanceof InputError) await Actor.fail(`Invalid input: ${err.message}`);
    throw err;
}

const failures = input.invalid.map((value) => ({ input: value, error: 'Not a valid public website address' }));
if (failures.length) log.warning(`Skipping ${failures.length} value(s) that are not websites: ${input.invalid.slice(0, 5).join(', ')}`);

const store = input.downloadImages === 'none' ? null : await Actor.openKeyValueStore();
const saveImage = store
    ? async (key, buffer, contentType) => {
        await store.setValue(key, buffer, { contentType });
        return store.getPublicUrl(key);
    }
    : undefined;

log.info(`Finding favicons and logos of ${input.targets.length} website(s)...`);

let chargeLimitReached = false;
let saved = 0;
let done = 0;

async function processTarget(target) {
    let item;
    try {
        item = await processWebsite(target, input, { saveImage });
    } catch (err) {
        if (!(err instanceof FetchError || err instanceof NothingFoundError)) log.exception(err, `${target.url}: unexpected error`);
        else log.warning(`${target.url}: ${err.message}`);
        failures.push({ input: target.input, url: target.url, statusCode: err.statusCode ?? null, error: err.message });
        return;
    } finally {
        done++;
        if (done % 50 === 0) log.info(`Checked ${done}/${input.targets.length} websites.`);
    }
    if (chargeLimitReached) return;
    const res = await Actor.pushData(item);
    saved++;
    if (res?.eventChargeLimitReached) {
        chargeLimitReached = true;
        log.warning('Reached the maximum cost you set for this run. Stopping early; the websites checked so far are saved.');
    }
}

const queue = [...input.targets];
await Promise.all(Array.from({ length: Math.min(input.maxConcurrency, queue.length) }, async () => {
    while (queue.length && !chargeLimitReached) await processTarget(queue.shift());
}));

if (failures.length) await Actor.setValue('FAILED', failures);
log.info(`Done: ${saved} website(s) saved, ${failures.length} failed or had no icon (not charged).`);
await Actor.exit();
