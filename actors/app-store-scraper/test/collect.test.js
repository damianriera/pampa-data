import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planTasks, runTask } from '../src/collect.js';
import { createClient, lookupUrl, searchUrl } from '../src/itunes.js';
import { fakeClient, input } from './helpers.js';

test('urls follow the API docs', () => {
    assert.equal(searchUrl('habit tracker', { country: 'us', platform: 'ipad', limit: 10, language: 'en_us' }),
        'https://itunes.apple.com/search?term=habit+tracker&country=us&media=software&entity=iPadSoftware&limit=10&lang=en_us');
    assert.equal(lookupUrl({ ids: ['1', '2'] }, { country: 'ar' }), 'https://itunes.apple.com/lookup?country=ar&id=1%2C2');
    assert.match(lookupUrl({ developerId: '284882218' }, { country: 'us' }), /id=284882218&entity=software%2CmacSoftware&limit=200/);
});

test('plans searches, developers and batched lookups per country', () => {
    const apps = Array.from({ length: 150 }, (_, i) => String(100000 + i)).concat(['com.spotify.client']);
    const t = planTasks(input({ searchTerms: ['a', 'b'], developers: ['284882218'], apps, countries: ['us', 'ar'] }));
    assert.equal(t.length, 2 * (2 + 1 + 2 + 1));
    assert.equal(t.filter((x) => x.kind === 'apps' && x.type === 'id')[0].refs.length, 100);
});

test('search rows carry term and position, capped at max', async () => {
    const client = fakeClient({ '/search?': 'search_habit_tracker_us.json' });
    const { rows, missing } = await runTask({ kind: 'search', country: 'us', term: 'habit tracker' }, client, input({ maxResultsPerSearch: 3 }), 'T');
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map((r) => r.position), [1, 2, 3]);
    assert.ok(rows.every((r) => r.source === 'search' && r.searchTerm === 'habit tracker' && r.scrapedAt === 'T'));
    assert.deepEqual(missing, []);
});

test('app lookup reports ids not found', async () => {
    const client = fakeClient({ '/lookup?': 'lookup_two_apps_ar.json' });
    const { rows, missing } = await runTask({ kind: 'apps', country: 'ar', type: 'id', refs: ['284882215', '324684580', '999999999'] }, client, input(), 'T');
    assert.deepEqual(rows.map((r) => r.appId), [284882215, 324684580]);
    assert.ok(rows.every((r) => r.country === 'ar' && r.source === 'app'));
    assert.deepEqual(missing, ['999999999']);
});

test('bundle id lookup matches case-insensitively', async () => {
    const client = fakeClient({ '/lookup?': 'lookup_bundle_spotify_us.json' });
    const { rows, missing } = await runTask({ kind: 'apps', country: 'us', type: 'bundleId', refs: ['COM.SPOTIFY.CLIENT'] }, client, input(), 'T');
    assert.equal(rows.length, 1);
    assert.deepEqual(missing, []);
});

test('developer lookup returns its apps', async () => {
    const client = fakeClient({ '/lookup?': 'developer_meta_us.json' });
    const { rows, missing } = await runTask({ kind: 'developer', country: 'us', developerId: '284882218' }, client, input(), 'T');
    assert.equal(rows.length, 3);
    assert.ok(rows.every((r) => r.developer === 'Meta Platforms, Inc.' && r.developerQuery === '284882218'));
    assert.deepEqual(missing, []);
});

test('retries 403 bursts, then gives up on 400 right away', async () => {
    let n = 0;
    const flaky = createClient({ backoffMs: 0, intervalMs: 0, sleepImpl: async () => {}, getImpl: async () => (++n < 3 ? { status: 403 } : { status: 200, body: '{"results":[]}' }) });
    assert.deepEqual(await flaky.search('x', { country: 'us', platform: 'iphone', limit: 1 }), []);
    assert.equal(n, 3);
    const calls = [];
    const bad = fakeClient({ '/search?': { status: 400 } }, calls);
    await assert.rejects(bad.search('x', { country: 'zz', platform: 'iphone', limit: 1 }), /HTTP 400/);
    assert.equal(calls.length, 1);
});

test('paces calls at the configured interval', async () => {
    let t = 0;
    const waits = [];
    const c = createClient({ intervalMs: 3000, now: () => t, sleepImpl: async (ms) => { waits.push(ms); t += ms; }, getImpl: async () => ({ status: 200, body: '{"results":[]}' }) });
    await Promise.all([c.getText('a'), c.getText('b'), c.getText('c')]);
    assert.deepEqual(waits, [3000, 3000]);
    assert.equal(c.requests, 3);
});
