import assert from 'node:assert/strict';
import { test } from 'node:test';

import { InputError, normalizeInput, toUrl } from '../src/input.js';

test('toUrl accepts domains and URLs, rejects junk and private hosts', () => {
    assert.equal(toUrl('Example.com').href, 'https://example.com/');
    assert.equal(toUrl('http://shop.example.com/x#y').href, 'http://shop.example.com/x');
    for (const bad of ['', 'not a site', 'localhost', 'ftp://x.com', '10.0.0.1', 'printer.local', null]) assert.equal(toUrl(bad), null, String(bad));
});

test('normalizeInput dedupes, collects invalid values and applies defaults', () => {
    const input = normalizeInput({ websites: ['apify.com', 'https://apify.com/', 'nope'], urls: [{ url: 'stripe.com' }] });
    assert.deepEqual(input.targets.map((t) => t.url), ['https://apify.com/', 'https://stripe.com/']);
    assert.deepEqual(input.invalid, ['nope']);
    assert.equal(input.downloadImages, 'none');
    assert.equal(input.checkImages, true);
    assert.equal(input.includeHeaderSvg, true);
    assert.equal(input.maxConcurrency, 5);
});

test('normalizeInput rejects bad options', () => {
    assert.throws(() => normalizeInput({}), InputError);
    assert.throws(() => normalizeInput({ websites: 'apify.com' }), InputError);
    assert.throws(() => normalizeInput({ websites: ['a.com'], downloadImages: 'yes' }), InputError);
    assert.throws(() => normalizeInput({ websites: ['a.com'], maxConcurrency: 50 }), InputError);
});
