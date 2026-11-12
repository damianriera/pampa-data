import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filters, fixture } from './helpers.js';
import { HttpError, fetchJson } from '../src/http.js';
import { jobMatches } from '../src/filters.js';
import { BoardNotFoundError, scrapeBoard } from '../src/scrape.js';
import { htmlToText } from '../src/text.js';

const job = (over = {}) => ({ title: 'Senior Backend Engineer', location: 'Buenos Aires, Argentina', locations: ['Buenos Aires, Argentina'], country: 'AR', isRemote: false, postedAt: new Date().toISOString(), ...over });

test('jobMatches applies keyword, exclude, location, remote and date filters', () => {
    const now = Date.parse('2026-11-11T12:00:00Z');
    assert.ok(jobMatches(job(), filters({ keywords: ['engineer'] })));
    assert.ok(!jobMatches(job(), filters({ keywords: ['designer'] })));
    assert.ok(!jobMatches(job(), filters({ excludeKeywords: ['senior'] })));
    assert.ok(jobMatches(job(), filters({ locations: ['argentina', 'remote'] })));
    assert.ok(!jobMatches(job(), filters({ locations: ['berlin'] })));
    assert.ok(!jobMatches(job(), filters({ remoteOnly: true })));
    assert.ok(jobMatches(job({ postedAt: '2026-11-11T00:00:00Z' }), filters({ postedWithinDays: 1 }), now));
    assert.ok(!jobMatches(job({ postedAt: '2026-11-03T00:00:00Z' }), filters({ postedWithinDays: 7 }), now));
    assert.ok(!jobMatches(job({ postedAt: null }), filters({ postedWithinDays: 7 }), now));
});

test('scrapeBoard auto-detects the ATS from a bare name', async () => {
    const urls = [];
    const http = async (url) => {
        urls.push(url);
        if (url.includes('greenhouse')) throw new HttpError(404, url);
        return fixture('lever_postings.json');
    };
    const r = await scrapeBoard({ input: 'spotify', ats: 'auto', slug: 'spotify' }, filters({ keywords: ['account executive'] }), { http });
    assert.equal(r.board.ats, 'lever');
    assert.equal(r.totalJobs, 3);
    assert.ok(r.jobs.length >= 1 && r.jobs.every((j) => /account executive/i.test(j.title)));
});

test('scrapeBoard reports unknown boards and applies the per-company limit', async () => {
    const notFound = async (url) => { throw new HttpError(404, url); };
    await assert.rejects(scrapeBoard({ ats: 'auto', slug: 'zzz' }, filters(), { http: notFound }), BoardNotFoundError);
    await assert.rejects(scrapeBoard({ ats: 'ashby', slug: 'zzz' }, filters(), { http: notFound }), BoardNotFoundError);
    const r = await scrapeBoard({ ats: 'ashby', slug: 'ramp' }, filters({ maxJobsPerCompany: 2 }), { http: async () => fixture('ashby_board.json') });
    assert.equal(r.jobs.length, 2);
    assert.ok(r.jobs[0].postedAt >= r.jobs[1].postedAt);
});

test('fetchJson retries 429 and 5xx, not 404', async () => {
    let n = 0;
    const flaky = async () => (++n < 3 ? new Response('', { status: n === 1 ? 429 : 503 }) : new Response('{"ok":1}'));
    assert.deepEqual(await fetchJson('https://x', { fetchImpl: flaky, sleepImpl: async () => {} }), { ok: 1 });
    assert.equal(n, 3);
    n = 0;
    await assert.rejects(fetchJson('https://x', { fetchImpl: async () => { n++; return new Response('', { status: 404 }); }, sleepImpl: async () => {} }), (e) => e.status === 404);
    assert.equal(n, 1);
});

test('htmlToText keeps structure and decodes entities', () => {
    assert.equal(htmlToText('<p>Hi &amp; welcome</p><ul><li>One</li><li>Two</li></ul>'), 'Hi & welcome\n• One\n• Two');
});
