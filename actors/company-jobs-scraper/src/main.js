import { Actor, log } from 'apify';

import { InputError, normalizeInput } from './input.js';
import { scrapeBoard } from './scrape.js';

await Actor.init();

let input;
try {
    input = normalizeInput((await Actor.getInput()) ?? {});
} catch (err) {
    if (err instanceof InputError) await Actor.fail(`Invalid input: ${err.message}`);
    throw err;
}

const failures = input.invalid.map((value) => ({ input: value, error: 'Not a Greenhouse, Lever, Ashby or Workday career page, or a board name' }));
if (failures.length) log.warning(`Skipping ${failures.length} value(s) that are not career boards: ${input.invalid.slice(0, 5).join(', ')}`);

log.info(`Collecting open jobs from ${input.boards.length} career board(s)...`);
const scrapedAt = new Date().toISOString();
const summary = [];
let chargeLimitReached = false;
let saved = 0;

async function processBoard(board) {
    let result;
    try {
        result = await scrapeBoard(board, input, { onWarning: (m) => log.warning(m) });
    } catch (err) {
        log.warning(`${board.input}: ${err.message}`);
        failures.push({ input: board.input, error: err.message });
        return;
    }
    const { jobs, totalJobs } = result;
    const entry = { input: board.input, ats: result.board.ats, board: result.board.slug, jobsListed: totalJobs, matched: jobs.length, saved: 0 };
    summary.push(entry);
    if (chargeLimitReached || !jobs.length) {
        log.info(`${board.input} (${result.board.ats}): ${totalJobs} job(s) listed, ${jobs.length} match the filters.`);
        return;
    }
    const items = jobs.map((j) => {
        const item = { ...j, scrapedAt };
        if (item.description === undefined) delete item.description;
        return item;
    });
    for (let i = 0; i < items.length && !chargeLimitReached; i += 100) {
        const chunk = items.slice(i, i + 100);
        const res = await Actor.pushData(chunk);
        if (res?.eventChargeLimitReached) {
            chargeLimitReached = true;
            log.warning('Reached the maximum cost you set for this run. Stopping early; the jobs collected so far are saved.');
        }
        saved += chunk.length;
        entry.saved += chunk.length;
    }
    log.info(`${board.input} (${result.board.ats}): ${totalJobs} job(s) listed, ${jobs.length} saved.`);
}

const queue = [...input.boards];
await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length && !chargeLimitReached) await processBoard(queue.shift());
}));

await Actor.setValue('SUMMARY', summary);
if (failures.length) await Actor.setValue('FAILED', failures);
log.info(`Done: ${saved} job(s) saved from ${summary.length} board(s); ${failures.length} input(s) failed (not charged).`);
await Actor.exit();
