import { Actor, log } from 'apify';

import { describeTask, planTasks, runTask } from './collect.js';
import { InputError, normalizeInput } from './input.js';
import { createClient } from './itunes.js';

await Actor.init();

let input;
try {
    input = normalizeInput((await Actor.getInput()) ?? {});
} catch (err) {
    if (err instanceof InputError) await Actor.fail(`Invalid input: ${err.message}`);
    throw err;
}

const client = createClient();
const tasks = planTasks(input);
const minutes = Math.max(1, Math.ceil((tasks.length * 3) / 60));
log.info(`${tasks.length} App Store API call(s) planned for ${input.countries.length} country(ies). Apple allows about 20 calls per minute, so this takes about ${minutes} minute(s).`);

const scrapedAt = new Date().toISOString();
const summary = [];
const failures = [];
let saved = 0;
let chargeLimitReached = false;

for (const task of tasks) {
    if (chargeLimitReached) break;
    const label = describeTask(task);
    let result;
    try {
        result = await runTask(task, client, input, scrapedAt);
    } catch (err) {
        log.warning(`${label}: ${err.message}`);
        failures.push({ ...taskInfo(task), error: err.message });
        continue;
    }
    if (result.missing.length) {
        failures.push({ ...taskInfo(task), error: 'Not found in this country\'s App Store', notFound: result.missing });
    }
    let pushed = 0;
    for (let i = 0; i < result.rows.length && !chargeLimitReached; i += 100) {
        const chunk = result.rows.slice(i, i + 100);
        const res = await Actor.pushData(chunk);
        pushed += chunk.length;
        if (res?.eventChargeLimitReached) {
            chargeLimitReached = true;
            log.warning('Reached the maximum cost you set for this run. Stopping early; the apps collected so far are saved.');
        }
    }
    saved += pushed;
    summary.push({ ...taskInfo(task), apps: result.rows.length, saved: pushed, notFound: result.missing.length });
    log.info(`${label}: ${result.rows.length} app(s).`);
}

function taskInfo(t) {
    if (t.kind === 'search') return { type: 'search', country: t.country, searchTerm: t.term };
    if (t.kind === 'developer') return { type: 'developer', country: t.country, developerId: t.developerId };
    return { type: t.type === 'id' ? 'appIds' : 'bundleIds', country: t.country, requested: t.refs.length };
}

await Actor.setValue('SUMMARY', summary);
if (failures.length) await Actor.setValue('FAILED', failures);
log.info(`Done: ${saved} app row(s) saved from ${client.requests} API call(s); ${failures.length} input(s) with failures or apps not found (not charged).`);
await Actor.exit();
