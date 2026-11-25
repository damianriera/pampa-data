import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { bodyText, fetchUrl } from '../src/fetch.js';

test('decodes the charset named in the XML declaration', () => {
    const xml = Buffer.concat([Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><rss><channel><title>Caf'), Buffer.from([0xe9]), Buffer.from('</title></channel></rss>')]);
    assert.match(bodyText({ buffer: xml, contentType: 'text/xml' }), /Café/);
});

test('falls back to the HTTP charset, strips a BOM and unpacks gzip', () => {
    const latin = Buffer.concat([Buffer.from('<rss>ni'), Buffer.from([0xf1]), Buffer.from('o</rss>')]);
    assert.equal(bodyText({ buffer: latin, contentType: 'application/rss+xml; charset=windows-1252' }), '<rss>niño</rss>');
    assert.equal(bodyText({ buffer: Buffer.from('﻿<rss/>'), contentType: '' }), '<rss/>');
    assert.equal(bodyText({ buffer: gzipSync('<rss/>'), contentType: 'application/gzip' }), '<rss/>');
});

test('follows redirects to the feed', async () => {
    const answers = {
        'http://ex.com/feed': new Response(null, { status: 301, headers: { location: 'https://ex.com/feed/' } }),
        'https://ex.com/feed/': new Response('<rss/>', { status: 200, headers: { 'content-type': 'application/rss+xml' } }),
    };
    const res = await fetchUrl('http://ex.com/feed', { fetchImpl: async (u) => answers[u] });
    assert.equal(res.url, 'https://ex.com/feed/');
    assert.equal(bodyText(res), '<rss/>');
});
