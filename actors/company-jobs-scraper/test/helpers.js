import { readFileSync } from 'node:fs';

export const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

export const filters = (over = {}) => ({
    keywords: [], excludeKeywords: [], locations: [], remoteOnly: false, postedWithinDays: null,
    maxJobsPerCompany: Infinity, includeDescription: false, ...over,
});
