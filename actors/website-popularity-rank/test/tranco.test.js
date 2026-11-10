import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HistoryClient, HttpError, downloadRanks, getLatestList, ranksFromLines, summarizeHistory, tierOf } from '../src/tranco.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('ranksFromLines keeps only wanted domains from a CRLF list', async () => {
    const lines = fixture('list_head.csv').split('\n');
    const found = await ranksFromLines(lines, new Set(['google.com', 'github.com', 'bbc.co.uk', 'nope.example']));
    assert.equal(found.get('google.com'), 1);
    assert.equal(found.get('github.com'), 33);
    assert.equal(found.get('bbc.co.uk'), 244);
    assert.equal(found.has('nope.example'), false);
});

test('downloadRanks streams a response body', async () => {
    const fetchImpl = async () => new Response(fixture('list_head.csv'));
    const found = await downloadRanks('https://x/list', new Set(['mercadolibre.com.ar']), fetchImpl);
    assert.equal(found.get('mercadolibre.com.ar'), 968);
});

test('getLatestList reads list metadata', async () => {
    const fetchImpl = async () => jsonResponse({ list_id: 'ABC12', available: true, created_on: '2026-11-09T22:00:01', download: 'https://tranco-list.eu/download/ABC12/1000000' });
    assert.deepEqual(await getLatestList(fetchImpl), { listId: 'ABC12', createdOn: '2026-11-09', downloadUrl: 'https://tranco-list.eu/download/ABC12/1000000' });
});

test('HistoryClient returns history oldest first and retries 429', async () => {
    let calls = 0;
    const fetchImpl = async () => (++calls === 1 ? jsonResponse({}, 429) : new Response(fixture('ranks_github.json')));
    const client = new HistoryClient({ fetchImpl, minIntervalMs: 0, sleepImpl: async () => {} });
    const h = await client.history('github.com');
    assert.equal(calls, 2);
    assert.ok(h.length >= 20);
    assert.ok(h[0].date < h.at(-1).date);
});

test('HistoryClient does not retry a 404', async () => {
    let calls = 0;
    const client = new HistoryClient({ fetchImpl: async () => { calls++; return jsonResponse({}, 404); }, minIntervalMs: 0, sleepImpl: async () => {} });
    await assert.rejects(client.history('x.com'), HttpError);
    assert.equal(calls, 1);
});

test('HistoryClient spaces requests', async () => {
    const waits = [];
    const client = new HistoryClient({ fetchImpl: async () => jsonResponse({ ranks: [] }), minIntervalMs: 1000, sleepImpl: async (ms) => { waits.push(ms); } });
    await Promise.all([client.history('a.com'), client.history('b.com')]);
    assert.equal(waits.length, 1);
    assert.ok(waits[0] > 900);
});

test('summarizeHistory computes best, worst, changes and trend', () => {
    const h = [
        { date: '2026-10-01', rank: 200 }, { date: '2026-10-25', rank: 150 },
        { date: '2026-11-01', rank: 120 }, { date: '2026-11-08', rank: 100 },
    ];
    const s = summarizeHistory(h);
    assert.equal(s.bestRank, 100);
    assert.equal(s.worstRank, 200);
    assert.equal(s.averageRank, 143);
    assert.equal(s.change7d, 20);
    assert.equal(s.change30d, 100);
    assert.equal(s.trend, 'rising');
    assert.equal(summarizeHistory([{ date: '2026-11-01', rank: 100 }, { date: '2026-11-08', rank: 101 }]).trend, 'stable');
    assert.equal(summarizeHistory([]).bestRank, null);
});

test('tierOf buckets ranks', () => {
    assert.equal(tierOf(null), 'Not in top 1M');
    assert.equal(tierOf(33), 'Top 100');
    assert.equal(tierOf(968), 'Top 1K');
    assert.equal(tierOf(500000), 'Top 1M');
});
