import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchSiteInfo, parseHomepage } from '../src/site.js';

test('parseHomepage extracts title, description and language', () => {
    const html = `<html lang="es-AR"><head><title> Mercado &amp; Libre </title>
        <meta content="Compr&aacute; online" name="description"></head></html>`;
    const p = parseHomepage(html);
    assert.equal(p.title, 'Mercado & Libre');
    assert.equal(p.description, 'Compr&aacute; online');
    assert.equal(p.language, 'es-AR');
    assert.equal(parseHomepage('<meta property="og:description" content="OG text">').description, 'OG text');
});

test('fetchSiteInfo falls back to http and reports errors', async () => {
    const seen = [];
    const fetchImpl = async (url) => {
        seen.push(url);
        if (url.startsWith('https')) throw Object.assign(new Error('fail'), { cause: { code: 'ECONNREFUSED' } });
        return new Response('<title>Hi</title>', { headers: { 'content-type': 'text/html', server: 'nginx' } });
    };
    const info = await fetchSiteInfo('example.com', { fetchImpl });
    assert.deepEqual(seen, ['https://example.com/', 'http://example.com/']);
    assert.equal(info.reachable, true);
    assert.equal(info.title, 'Hi');
    assert.equal(info.server, 'nginx');

    const down = await fetchSiteInfo('example.com', { fetchImpl: async () => { throw Object.assign(new Error('x'), { cause: { code: 'ENOTFOUND' } }); } });
    assert.equal(down.reachable, false);
    assert.equal(down.error, 'ENOTFOUND');
});
