import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, normalizeInput, toUrl } from '../src/input.js';

test('accepts feeds, websites and feed: URLs; reports junk', () => {
    const out = normalizeInput({ urls: ['https://xkcd.com/atom.xml', 'stackoverflow.blog', 'feed://ex.com/rss', 'not a url', { url: 'https://a.org/feed' }] });
    assert.deepEqual(out.sources, ['https://xkcd.com/atom.xml', 'https://stackoverflow.blog/', 'https://ex.com/rss', 'https://a.org/feed']);
    assert.deepEqual(out.invalid, ['not a url']);
    assert.equal(out.maxItemsPerFeed, 100);
    assert.equal(out.content, 'none');
    assert.equal(out.deduplicate, true);
});

test('keywords from a list or a comma string; publishedAfter parsed', () => {
    const out = normalizeInput({ urls: ['a.com'], keywords: 'ai, llm ,ai', publishedAfter: '3 days' }, new Date('2026-11-24T00:00:00Z'));
    assert.deepEqual(out.keywords, ['ai', 'llm']);
    assert.equal(out.since.toISOString(), '2026-11-21T00:00:00.000Z');
});

test('rejects bad input', () => {
    assert.throws(() => normalizeInput({}), InputError);
    assert.throws(() => normalizeInput({ urls: ['nope'] }), InputError);
    assert.throws(() => normalizeInput({ urls: ['a.com'], content: 'pdf' }), InputError);
    assert.throws(() => normalizeInput({ urls: ['a.com'], publishedAfter: 'whenever' }), InputError);
    assert.throws(() => normalizeInput({ urls: ['a.com'], maxItemsPerFeed: 0 }), InputError);
    assert.equal(toUrl('http://localhost/feed'), null);
    assert.equal(toUrl('ftp://a.com/feed'), null);
});
