import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FetchError, HostLimiter, fetchUrl } from '../src/fetch.js';

const hop = (location, status = 301) => new Response(null, { status, headers: { location } });

test('records every redirect hop', async () => {
    const answers = {
        'http://a.com/': hop('https://a.com/'),
        'https://a.com/': hop('/home', 302),
        'https://a.com/home': new Response('<title>x</title>', { status: 200, headers: { 'content-type': 'text/html' } }),
    };
    const res = await fetchUrl('http://a.com/', { fetchImpl: async (u) => answers[u] });
    assert.equal(res.url, 'https://a.com/home');
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.redirectChain, [{ url: 'http://a.com/', statusCode: 301 }, { url: 'https://a.com/', statusCode: 302 }]);
    assert.equal(res.buffer.toString(), '<title>x</title>');
});

test('redirect loops and network errors throw FetchError', async () => {
    await assert.rejects(fetchUrl('https://a.com/1', { fetchImpl: async (u) => hop(u.endsWith('1') ? '/2' : '/1') }), (e) => e instanceof FetchError && /loop/.test(e.message));
    await assert.rejects(fetchUrl('https://a.com/', { fetchImpl: async () => { throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } }); } }),
        (e) => e instanceof FetchError && e.message === 'ENOTFOUND');
});

test('skips bodies of binary files', async () => {
    const res = await fetchUrl('https://a.com/x.png', { fetchImpl: async () => new Response(Buffer.alloc(100), { status: 200, headers: { 'content-type': 'image/png' } }) });
    assert.equal(res.bytes, 0);
    assert.equal(res.contentType, 'image/png');
});

test('host limiter caps parallel requests per host', async () => {
    const limiter = new HostLimiter(2);
    let active = 0;
    let peak = 0;
    const job = () => limiter.run('a.com', async () => { active++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 10)); active--; });
    await Promise.all([job(), job(), job(), job(), job()]);
    assert.equal(peak, 2);
});
