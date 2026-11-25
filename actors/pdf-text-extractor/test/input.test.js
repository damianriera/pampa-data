import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, normalizeInput, parsePageRange, selectPages, toUrl } from '../src/input.js';

test('defaults and URL cleanup', () => {
    const i = normalizeInput({ urls: ['www.irs.gov/pub/irs-pdf/fw9.pdf', { url: 'https://a.com/x.pdf#page=2' }, 'https://a.com/x.pdf', 'not a url', 'http://localhost/a.pdf'] });
    assert.deepEqual(i.urls, ['https://www.irs.gov/pub/irs-pdf/fw9.pdf', 'https://a.com/x.pdf']);
    assert.deepEqual(i.invalid, ['not a url', 'http://localhost/a.pdf']);
    assert.equal(i.textFormat, 'text');
    assert.equal(i.includePages, false);
    assert.equal(i.maxFileSizeMb, 50);
    assert.deepEqual(i.pageRanges, []);
});

test('rejects bad input', () => {
    assert.throws(() => normalizeInput({}), InputError);
    assert.throws(() => normalizeInput({ urls: 'https://a.com/x.pdf' }), InputError);
    assert.throws(() => normalizeInput({ urls: ['nope'] }), /None of the values/);
    assert.throws(() => normalizeInput({ urls: ['a.com/x.pdf'], textFormat: 'html' }), /textFormat/);
    assert.throws(() => normalizeInput({ urls: ['a.com/x.pdf'], maxFileSizeMb: 500 }), /maxFileSizeMb/);
    assert.throws(() => normalizeInput({ urls: ['a.com/x.pdf'], pageRange: '5-2' }), /pageRange/);
    assert.throws(() => normalizeInput({ urls: ['a.com/x.pdf'], pageRange: 'abc' }), /pageRange/);
});

test('page ranges', () => {
    assert.deepEqual(parsePageRange('1-3, 7,10-'), [{ from: 1, to: 3 }, { from: 7, to: 7 }, { from: 10, to: Infinity }]);
    assert.deepEqual(parsePageRange('-2'), [{ from: 1, to: 2 }]);
    assert.deepEqual(selectPages(parsePageRange('2, 1-3, 9-'), 10), [1, 2, 3, 9, 10]);
    assert.deepEqual(selectPages([], 3), [1, 2, 3]);
    assert.deepEqual(selectPages(parsePageRange('20-'), 3), []);
});

test('toUrl', () => {
    assert.equal(toUrl('ftp://a.com/x.pdf'), null);
    assert.equal(toUrl('10.0.0.1/x.pdf'), null);
    assert.equal(toUrl('example.com/a b.pdf').href, 'https://example.com/a%20b.pdf');
});
