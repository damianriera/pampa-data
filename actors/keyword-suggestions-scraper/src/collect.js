import { buildQueries } from './expand.js';
import { getText } from './http.js';
import { SOURCES } from './sources/index.js';

async function pool(items, size, fn) {
    const queue = items.map((item, i) => [item, i]);
    await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
        while (queue.length) {
            const [item, i] = queue.shift();
            await fn(item, i);
        }
    }));
}

/**
 * Collects unique suggestions for one seed keyword from one source.
 * Returns { suggestions: [{ suggestion, position, query, modifier }], queries, failedQueries, errors }.
 * Order: the plain keyword's suggestions first, then each modifier in order.
 */
export async function collectSuggestions(keyword, sourceId, input, { http = {}, concurrency = 3 } = {}) {
    const source = SOURCES[sourceId];
    const queries = buildQueries(keyword, input);
    const answers = new Array(queries.length);
    const errors = [];

    await pool(queries, concurrency, async (q, i) => {
        try {
            answers[i] = source.parse(await getText(source.buildUrl(q.query, input), http));
        } catch (err) {
            errors.push({ query: q.query, error: err.message });
        }
    });
    if (errors.length === queries.length) {
        throw new Error(`${source.name}: every request failed (${errors[0].error})`);
    }

    const seen = new Set();
    const seed = keyword.toLowerCase();
    const suggestions = [];
    for (let i = 0; i < queries.length && suggestions.length < input.maxSuggestionsPerKeyword; i++) {
        (answers[i] ?? []).forEach((text, idx) => {
            const key = text.toLowerCase();
            if (seen.has(key) || suggestions.length >= input.maxSuggestionsPerKeyword) return;
            if (!input.includeSeedKeyword && key === seed) return;
            seen.add(key);
            suggestions.push({ suggestion: text, position: idx + 1, query: queries[i].query, modifier: queries[i].modifier });
        });
    }
    return { suggestions, queries: queries.length, failedQueries: errors.length, errors };
}
