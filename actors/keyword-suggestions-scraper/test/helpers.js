import { readFileSync } from 'node:fs';

export const fixtureText = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

export const opts = (over = {}) => ({
    language: 'en', country: 'us', expandAlphabet: false, expandQuestions: false, expandPrepositions: false,
    customModifiers: [], includeSeedKeyword: false, maxSuggestionsPerKeyword: Infinity, ...over,
});
