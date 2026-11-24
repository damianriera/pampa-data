import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSource } from '../src/reader.js';
import { fetchFromFixtures, fixture } from './helpers.js';

const opts = (byUrl) => ({ fetchImpl: fetchFromFixtures(byUrl), retryDelayMs: 1 });

test('a feed URL is read directly', async () => {
    const r = await readSource('https://xkcd.com/atom.xml', opts({ 'https://xkcd.com/atom.xml': fixture('xkcd_atom') }));
    assert.equal(r.discovered, false);
    assert.equal(r.feeds[0].feedUrl, 'https://xkcd.com/atom.xml');
    assert.equal(r.feeds[0].items.length, 4);
});

test('a website URL is resolved to the feed it declares', async () => {
    const r = await readSource('https://stackoverflow.blog/', opts({
        'https://stackoverflow.blog/': fixture('stackoverflow_blog_html'),
        'https://stackoverflow.blog/feed/': fixture('github_blog_rss'),
    }));
    assert.equal(r.discovered, true);
    assert.equal(r.feeds[0].feedUrl, 'https://stackoverflow.blog/feed/');
});

test('falls back to common feed paths when the page declares none', async () => {
    const page = { statusCode: 200, headers: { 'content-type': 'text/html' }, buffer: Buffer.from('<!doctype html><html><head><title>x</title></head></html>') };
    const r = await readSource('https://ex.com/', opts({ 'https://ex.com/': page, 'https://ex.com/rss.xml': fixture('debian_rdf') }));
    assert.equal(r.feeds[0].feedUrl, 'https://ex.com/rss.xml');
    assert.equal(r.feeds[0].feed.feedType, 'rss1');
});

test('blocked feeds and pages without feeds throw (reported, not charged)', async () => {
    await assert.rejects(readSource('https://www.lemonde.fr/rss/une.xml', opts({ 'https://www.lemonde.fr/rss/une.xml': fixture('blocked_403') })), /HTTP 403/);
    const page = { statusCode: 200, headers: { 'content-type': 'text/html' }, buffer: Buffer.from('<!doctype html><html></html>') };
    await assert.rejects(readSource('https://ex.com/', opts({ 'https://ex.com/': page })), /No feed found/);
});
