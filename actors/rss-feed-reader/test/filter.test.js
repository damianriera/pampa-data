import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupKey, matchKeywords, parseSince, passesFilters, sortNewestFirst } from '../src/filter.js';

const now = new Date('2026-11-24T12:00:00Z');

test('publishedAfter accepts dates and relative periods', () => {
    assert.equal(parseSince('7 days', now).toISOString(), '2026-11-17T12:00:00.000Z');
    assert.equal(parseSince('24 hours ago', now).toISOString(), '2026-11-23T12:00:00.000Z');
    assert.equal(parseSince('2026-11-01', now).toISOString(), '2026-11-01T00:00:00.000Z');
    assert.equal(parseSince('', now), null);
    assert.throws(() => parseSince('soon', now));
});

test('keyword filters ignore case and accents and search categories', () => {
    const item = { title: 'Nueva versión de Python', summary: 'Mejoras', categories: ['Releases'], contentText: null };
    assert.deepEqual(matchKeywords(item, ['VERSION', 'releases', 'java']), ['VERSION', 'releases']);
    const opts = { since: null, keywords: ['python'], excludeKeywords: [] };
    assert.equal(passesFilters(item, opts), true);
    assert.equal(passesFilters(item, { ...opts, excludeKeywords: ['mejoras'] }), false);
    assert.equal(passesFilters(item, { ...opts, keywords: ['rust'] }), false);
});

test('date filter drops old and undated items', () => {
    const opts = { since: new Date('2026-11-20T00:00:00Z'), keywords: [], excludeKeywords: [] };
    assert.equal(passesFilters({ published: '2026-11-21T00:00:00Z' }, opts), true);
    assert.equal(passesFilters({ published: '2026-11-19T00:00:00Z' }, opts), false);
    assert.equal(passesFilters({ published: null, updated: '2026-11-22T00:00:00Z' }, opts), true);
    assert.equal(passesFilters({ published: null, updated: null }, opts), false);
});

test('newest first, undated last in feed order', () => {
    const out = sortNewestFirst([{ n: 1, published: null }, { n: 2, published: '2026-01-01T00:00:00Z' }, { n: 3, published: null }, { n: 4, published: '2026-02-01T00:00:00Z' }]);
    assert.deepEqual(out.map((x) => x.n), [4, 2, 1, 3]);
});

test('dedup key ignores tracking parameters, www and trailing slash', () => {
    const a = dedupKey({ link: 'https://www.ex.com/post/?utm_source=rss&id=3#top' });
    const b = dedupKey({ link: 'https://ex.com/post?id=3' });
    assert.equal(a, b);
    assert.notEqual(dedupKey({ link: 'https://ex.com/post?id=4' }), b);
    assert.equal(dedupKey({ guid: 'x1' }), 'guid:x1');
});
