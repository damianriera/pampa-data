import { LOOKUP_BATCH } from './itunes.js';
import { toApp } from './transform.js';

/** The list of API calls a run needs, in order: searches, then developers, then app lookups, per country. */
export function planTasks(input) {
    const tasks = [];
    for (const country of input.countries) {
        for (const term of input.searchTerms) tasks.push({ kind: 'search', country, term });
        for (const developerId of input.developers) tasks.push({ kind: 'developer', country, developerId });
        for (const type of ['id', 'bundleId']) {
            const refs = input.apps.filter((a) => a.type === type).map((a) => a.value);
            for (let i = 0; i < refs.length; i += LOOKUP_BATCH) tasks.push({ kind: 'apps', country, type, refs: refs.slice(i, i + LOOKUP_BATCH) });
        }
    }
    return tasks;
}

/**
 * Runs one task with the client and returns { rows, missing }.
 * `missing` lists app ids or bundle ids that the store did not return (not charged).
 * Apple returns a couple fewer apps than `limit`, so searches ask for 10 more and cut the list.
 */
export async function runTask(task, client, input, scrapedAt = new Date().toISOString()) {
    const opts = { country: task.country, platform: input.platform, limit: Math.min(200, input.maxResultsPerSearch + 10), language: input.language };
    const fmt = { country: task.country, includeDescription: input.includeDescription, includeScreenshots: input.includeScreenshots };
    const seen = new Set();
    const once = (r) => !seen.has(r.trackId) && seen.add(r.trackId);

    if (task.kind === 'search') {
        const results = (await client.search(task.term, opts)).filter(once).slice(0, input.maxResultsPerSearch);
        const rows = results.map((r, i) => ({ ...toApp(r, fmt), source: 'search', searchTerm: task.term, position: i + 1, scrapedAt }));
        return { rows, missing: [] };
    }
    if (task.kind === 'developer') {
        const results = (await client.lookup({ developerId: task.developerId }, opts)).filter(once);
        const rows = results.map((r) => ({ ...toApp(r, fmt), source: 'developer', developerQuery: task.developerId, scrapedAt }));
        return { rows, missing: rows.length ? [] : [task.developerId] };
    }
    const query = task.type === 'id' ? { ids: task.refs } : { bundleIds: task.refs };
    const results = (await client.lookup(query, opts)).filter(once);
    const found = new Set(results.map((r) => String(task.type === 'id' ? r.trackId : r.bundleId).toLowerCase()));
    const rows = results.map((r) => ({ ...toApp(r, fmt), source: 'app', scrapedAt }));
    return { rows, missing: task.refs.filter((ref) => !found.has(ref.toLowerCase())) };
}

export const describeTask = (t) => {
    if (t.kind === 'search') return `search "${t.term}" (${t.country})`;
    if (t.kind === 'developer') return `developer ${t.developerId} (${t.country})`;
    return `${t.refs.length} app ${t.type === 'id' ? 'id' : 'bundle id'}(s) (${t.country})`;
};
