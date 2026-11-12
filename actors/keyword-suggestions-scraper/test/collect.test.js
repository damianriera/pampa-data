import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectSuggestions } from '../src/collect.js';
import { getText, HttpError } from '../src/http.js';
import { fixtureText, opts } from './helpers.js';

const fakeGet = (map) => async (url) => {
    const q = new URL(url).searchParams.get('q');
    if (q in map) return map[q];
    return { status: 200, body: JSON.stringify([q, [`${q} one`, `${q} two`]]) };
};
const http = (map) => ({ getImpl: fakeGet(map), sleepImpl: async () => {} });

test('dedupes across modifiers, drops the seed, keeps order', async () => {
    const r = await collectSuggestions('coffee maker', 'google', opts({ customModifiers: ['x'] }), {
        http: http({
            'coffee maker': { status: 200, body: fixtureText('google_coffee_maker.json') },
            'coffee maker x': { status: 200, body: JSON.stringify(['coffee maker x', ['coffee maker walmart', 'coffee maker xl']]) },
        }),
    });
    assert.equal(r.queries, 2);
    assert.equal(r.suggestions[0].suggestion, 'coffee maker with grinder');
    assert.equal(r.suggestions[0].position, 2);
    assert.ok(!r.suggestions.some((s) => s.suggestion === 'coffee maker'));
    assert.equal(r.suggestions.filter((s) => s.suggestion === 'coffee maker walmart').length, 1);
    const last = r.suggestions.at(-1);
    assert.deepEqual([last.suggestion, last.query, last.modifier], ['coffee maker xl', 'coffee maker x', '+x']);
});

test('includeSeedKeyword and max per keyword', async () => {
    const r = await collectSuggestions('coffee maker', 'google', opts({ includeSeedKeyword: true, maxSuggestionsPerKeyword: 3, expandAlphabet: true }), {
        http: http({ 'coffee maker': { status: 200, body: fixtureText('google_coffee_maker.json') } }),
    });
    assert.equal(r.suggestions.length, 3);
    assert.equal(r.suggestions[0].suggestion, 'coffee maker');
});

test('Bing 204 answers are empty, not errors', async () => {
    const r = await collectSuggestions('zzqqxxnotaword', 'bing', opts(), { http: http({ zzqqxxnotaword: { status: 204, body: '' } }) });
    assert.deepEqual(r.suggestions, []);
    assert.equal(r.failedQueries, 0);
});

test('partial failures are reported, total failure throws', async () => {
    const r = await collectSuggestions('a', 'google', opts({ customModifiers: ['b'] }), { http: http({ 'a b': { status: 403, body: '' } }) });
    assert.equal(r.failedQueries, 1);
    assert.equal(r.suggestions.length, 2);
    await assert.rejects(
        collectSuggestions('a', 'google', opts(), { http: http({ a: { status: 403, body: '' } }) }),
        /every request failed/,
    );
});

test('getText retries 429 and 5xx, not 4xx', async () => {
    let calls = 0;
    const flaky = async () => (++calls < 3 ? { status: calls === 1 ? 429 : 503, body: '' } : { status: 200, body: 'ok' });
    assert.equal(await getText('https://x/?q=1', { getImpl: flaky, sleepImpl: async () => {} }), 'ok');
    assert.equal(calls, 3);
    calls = 0;
    const forbidden = async () => { calls++; return { status: 403, body: '' }; };
    await assert.rejects(getText('https://x/', { getImpl: forbidden, sleepImpl: async () => {} }), HttpError);
    assert.equal(calls, 1);
});
