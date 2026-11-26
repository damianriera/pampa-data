import { Actor, log } from 'apify';

import { InputError, normalizeInput } from './input.js';
import { HostLimiter } from './limiter.js';
import { processUrl } from './process.js';

await Actor.init();

let input;
try {
    input = normalizeInput((await Actor.getInput()) ?? {});
} catch (err) {
    if (err instanceof InputError) await Actor.fail(`Invalid input: ${err.message}`);
    throw err;
}

const failures = input.invalid.map((value) => ({ url: value, error: 'Not a valid public web address' }));
if (failures.length) log.warning(`Skipping ${failures.length} value(s) that are not web addresses: ${input.invalid.slice(0, 5).join(', ')}`);

const limiter = new HostLimiter(2);
const token = Actor.getEnv().token ?? process.env.APIFY_TOKEN;
let saved = 0;
let done = 0;
let stop = false;

async function handle(url) {
    const { row, failure } = await processUrl(url, input, { limiter, token });
    if (failure) {
        log.warning(`${url}: ${failure.error}`);
        failures.push(failure);
        return;
    }
    if (stop) return;
    const res = await Actor.pushData(row);
    if (res?.eventChargeLimitReached) {
        if ((res.chargedCount ?? 1) > 0) saved++;
        if (!stop) log.warning('Reached the maximum cost you set for this run. Stopping early; the PDFs read so far are kept.');
        stop = true;
        return;
    }
    saved++;
    log.info(`${url}: ${row.pagesExtracted} page(s), ${row.wordCount} words`);
}

log.info(`Reading ${input.urls.length} PDF(s)...`);
const queue = [...input.urls];
await Promise.all(Array.from({ length: Math.min(input.maxConcurrency, queue.length) }, async () => {
    while (queue.length && !stop) {
        await handle(queue.shift());
        done++;
        if (done % 50 === 0) log.info(`Read ${done}/${input.urls.length} PDFs, ${saved} saved.`);
    }
}));

if (failures.length) await Actor.setValue('FAILED', failures);
log.info(`Done: ${saved} PDF(s) saved; ${failures.length} skipped (not charged, see the FAILED record).`);
if (saved === 0) {
    await Actor.fail('No PDF could be read. See the FAILED record for the reason per URL.');
}
await Actor.exit();
