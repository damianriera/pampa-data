import { readFileSync } from 'node:fs';
import { normalizeInput } from '../src/input.js';
import { createClient } from '../src/itunes.js';

export const fixtureText = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

/** A client that answers from fixtures: `routes` maps a URL substring to a fixture name or { status }. */
export function fakeClient(routes, calls = []) {
    return createClient({
        intervalMs: 0,
        backoffMs: 0,
        sleepImpl: async () => {},
        getImpl: async (url) => {
            calls.push(url);
            const key = Object.keys(routes).find((k) => url.includes(k));
            if (!key) return { status: 200, body: fixtureText('empty.json') };
            const r = routes[key];
            if (typeof r === 'string') return { status: 200, body: fixtureText(r) };
            return { status: r.status, body: '' };
        },
    });
}

export const input = (over = {}) => normalizeInput({ searchTerms: ['x'], ...over });
