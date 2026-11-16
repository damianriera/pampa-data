import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectSuggestions } from '../src/collect.js';
import { opts } from './helpers.js';

const live = { skip: !process.env.LIVE };

for (const source of ['google', 'youtube', 'bing']) {
    test(`live: ${source}`, live, async () => {
        const r = await collectSuggestions('coffee maker', source, opts({ customModifiers: ['for'] }));
        assert.equal(r.failedQueries, 0);
        assert.ok(r.suggestions.length >= 5, `got ${r.suggestions.length}`);
        assert.ok(r.suggestions.every((s) => s.suggestion && s.position >= 1));
    });
}
