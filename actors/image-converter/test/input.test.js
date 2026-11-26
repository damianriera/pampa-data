import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, normalizeInput, parseColor, toUrl } from '../src/input.js';

test('defaults: WebP, quality 80, no resize, metadata stripped', () => {
    const input = normalizeInput({ urls: ['example.com/a.png'] });
    assert.deepEqual(input.urls, ['https://example.com/a.png']);
    assert.equal(input.format, 'webp');
    assert.equal(input.quality, 80);
    assert.equal(input.width, null);
    assert.equal(input.height, null);
    assert.equal(input.fit, 'inside');
    assert.equal(input.withoutEnlargement, true);
    assert.equal(input.keepMetadata, false);
    assert.equal(input.background, '#ffffff');
});

test('accepts startUrls objects, dedupes and reports invalid values', () => {
    const input = normalizeInput({ startUrls: [{ url: 'https://a.com/x.jpg' }, { url: 'https://a.com/x.jpg' }, { url: 'nope' }, { url: 'http://localhost/a.png' }] });
    assert.deepEqual(input.urls, ['https://a.com/x.jpg']);
    assert.deepEqual(input.invalid, ['nope', 'http://localhost/a.png']);
});

test('jpg is an alias of jpeg; bad formats and fits fail', () => {
    assert.equal(normalizeInput({ urls: ['a.com/x'], format: 'JPG' }).format, 'jpeg');
    assert.throws(() => normalizeInput({ urls: ['a.com/x'], format: 'bmp' }), InputError);
    assert.throws(() => normalizeInput({ urls: ['a.com/x'], fit: 'stretch' }), InputError);
});

test('numbers are range-checked', () => {
    assert.throws(() => normalizeInput({ urls: ['a.com/x'], quality: 0 }), /quality/);
    assert.throws(() => normalizeInput({ urls: ['a.com/x'], width: 20000 }), /width/);
    assert.equal(normalizeInput({ urls: ['a.com/x'], width: '', height: 300 }).height, 300);
});

test('needs at least one URL', () => {
    assert.throws(() => normalizeInput({}), /at least one/);
    assert.throws(() => normalizeInput({ urls: ['not a url'] }), /None of the values/);
});

test('colors, key prefix and store name', () => {
    assert.equal(parseColor('#FFF'), '#ffffff');
    assert.equal(parseColor('000000'), '#000000');
    assert.throws(() => parseColor('white'), InputError);
    assert.equal(normalizeInput({ urls: ['a.com/x'], keyPrefix: 'shop-' }).keyPrefix, 'shop-');
    assert.throws(() => normalizeInput({ urls: ['a.com/x'], keyPrefix: 'a/b' }), /keyPrefix/);
    assert.throws(() => normalizeInput({ urls: ['a.com/x'], keyValueStoreName: 'my store' }), /keyValueStoreName/);
});

test('toUrl rejects non-web schemes and IPs', () => {
    assert.equal(toUrl('ftp://a.com/x'), null);
    assert.equal(toUrl('http://10.0.0.1/a.png'), null);
    assert.equal(toUrl('https://a.com/x.png#frag').href, 'https://a.com/x.png');
});
