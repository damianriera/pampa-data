import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, normalizeInput, toUrl } from '../src/input.js';

test('toUrl adds https and rejects non-public values', () => {
    assert.equal(toUrl('Example.com/blog').href, 'https://example.com/blog');
    assert.equal(toUrl('http://example.com/#top').href, 'http://example.com/');
    for (const bad of ['', 'localhost', 'ftp://x.com', '10.0.0.1', 'not a url', 'printer.local']) assert.equal(toUrl(bad), null, bad);
});

test('urls, startUrls objects and sitemaps', () => {
    const input = normalizeInput({ urls: ['example.com', 'nope'], startUrls: [{ url: 'https://example.com/a' }], sitemapUrls: ['example.org'], sitemapUrlFilter: '/blog/' });
    assert.deepEqual(input.pages, ['https://example.com/', 'https://example.com/a']);
    assert.deepEqual(input.sitemaps, ['https://example.org/']);
    assert.deepEqual(input.invalid, ['nope']);
    assert.ok(input.urlFilter.test('https://example.org/BLOG/x'));
    assert.equal(input.maxPages, 1000);
    assert.equal(input.checkRobotsTxt, true);
    assert.equal(input.includeLinks, false);
});

test('rejects empty or invalid input', () => {
    assert.throws(() => normalizeInput({}), InputError);
    assert.throws(() => normalizeInput({ urls: 'example.com' }), InputError);
    assert.throws(() => normalizeInput({ urls: ['nope'] }), InputError);
    assert.throws(() => normalizeInput({ urls: ['a.com'], maxPages: 0 }), InputError);
    assert.throws(() => normalizeInput({ urls: ['a.com'], sitemapUrlFilter: '(' }), InputError);
});
