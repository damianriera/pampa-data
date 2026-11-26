import { Actor, log } from 'apify';

import { InputError, normalizeInput } from './input.js';
import { HostLimiter } from './limiter.js';
import { KeyNamer } from './naming.js';
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

const store = input.keyValueStoreName ? await Actor.openKeyValueStore(input.keyValueStoreName) : await Actor.openKeyValueStore();
const save = async (key, buffer, contentType) => {
    await store.setValue(key, buffer, { contentType });
    return store.getPublicUrl(key);
};
const namer = new KeyNamer(input.keyPrefix);
const limiter = new HostLimiter(2);
// Decoding a 40 MP image takes about 160 MB, so at most two conversions run at once; AVIF encoding needs far more, so one.
const cpuLimiter = new HostLimiter(['avif', 'original'].includes(input.format) ? 1 : 2);
input.memoryMb = Number(process.env.ACTOR_MEMORY_MBYTES) || 512;
const token = Actor.getEnv().token ?? process.env.APIFY_TOKEN;
let saved = 0;
let done = 0;
let stop = false;
let bytesIn = 0;
let bytesOut = 0;

async function handle(url) {
    if (stop) return;
    const { row, failure } = await processUrl(url, input, { limiter, cpuLimiter, token, save, namer });
    if (failure) {
        log.warning(`${url}: ${failure.error}`);
        failures.push(failure);
        return;
    }
    if (stop) return;
    const res = await Actor.pushData(row);
    bytesIn += row.inputBytes;
    bytesOut += row.outputBytes;
    if (res?.eventChargeLimitReached) {
        if ((res.chargedCount ?? 1) > 0) saved++;
        if (!stop) log.warning('Reached the maximum cost you set for this run. Stopping early; the images converted so far are kept.');
        stop = true;
        return;
    }
    saved++;
    log.info(`${url}: ${row.inputFormat} ${row.inputWidth}x${row.inputHeight} -> ${row.outputFormat} ${row.outputWidth}x${row.outputHeight}, ${row.savedPercent >= 0 ? `${row.savedPercent}% smaller` : `${-row.savedPercent}% larger`}`);
}

const size = input.width || input.height ? `, max ${input.width ?? 'any'}x${input.height ?? 'any'} (${input.fit})` : '';
log.info(`Converting ${input.urls.length} image(s) to ${input.format}${size}...`);
const queue = [...input.urls];
await Promise.all(Array.from({ length: Math.min(input.maxConcurrency, queue.length) }, async () => {
    while (queue.length && !stop) {
        await handle(queue.shift());
        done++;
        if (done % 50 === 0) log.info(`Processed ${done}/${input.urls.length} images, ${saved} saved.`);
    }
}));

if (failures.length) await Actor.setValue('FAILED', failures);
const pct = bytesIn ? Math.round((1 - bytesOut / bytesIn) * 1000) / 10 : 0;
log.info(`Done: ${saved} image(s) converted (${pct}% smaller in total); ${failures.length} skipped (not charged, see the FAILED record).`);
if (saved === 0) {
    await Actor.fail('No image could be converted. See the FAILED record for the reason per URL.');
}
await Actor.exit();
