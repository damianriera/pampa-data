import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, normalizeInput } from '../src/input.js';

test('defaults', () => {
    const i = normalizeInput({ keywords: [' coffee  maker ', 'Coffee Maker', 'tea'] });
    assert.deepEqual(i.keywords, ['coffee maker', 'tea']);
    assert.deepEqual(i.sources, ['google', 'youtube', 'bing']);
    assert.equal(i.language, 'en');
    assert.equal(i.country, null);
    assert.equal(i.maxSuggestionsPerKeyword, Infinity);
    assert.equal(i.includeSeedKeyword, false);
});

test('rejects bad input', () => {
    assert.throws(() => normalizeInput({}), InputError);
    assert.throws(() => normalizeInput({ keywords: ['a'], sources: ['amazon'] }), /Unknown source/);
    assert.throws(() => normalizeInput({ keywords: ['a'], sources: [] }), /at least one source/);
    assert.throws(() => normalizeInput({ keywords: ['a'], country: 'usa' }), /country/);
    assert.throws(() => normalizeInput({ keywords: ['a'], language: 'english' }), /language/);
    assert.throws(() => normalizeInput({ keywords: ['a'], maxSuggestionsPerKeyword: -1 }), /maxSuggestions/);
    assert.throws(() => normalizeInput({ keywords: Array.from({ length: 1001 }, (_, n) => `k${n}`) }), /At most 1000/);
});

test('normalizes codes', () => {
    const i = normalizeInput({ keywords: ['a'], sources: ['Google'], language: 'PT-BR', country: 'BR', maxSuggestionsPerKeyword: 50 });
    assert.deepEqual(i.sources, ['google']);
    assert.equal(i.language, 'pt-br');
    assert.equal(i.country, 'br');
    assert.equal(i.maxSuggestionsPerKeyword, 50);
});
