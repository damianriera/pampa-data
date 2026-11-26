import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInput } from '../src/input.js';
import { KeyNamer } from '../src/naming.js';
import { processUrl } from '../src/process.js';
import { fetchStub, fixture, memoryStore } from './helpers.js';

const sites = {
    'https://shop.example.com/img/Red%20Shoes.jpg': { body: fixture('photo.jpg'), headers: { 'content-type': 'image/jpeg' } },
    'https://shop.example.com/logo.png': { body: fixture('transparent.png') },
    'https://shop.example.com/': { body: fixture('page.html'), headers: { 'content-type': 'text/html' } },
    'https://shop.example.com/icon.svg': { body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>', headers: { 'content-type': 'image/svg+xml' } },
};

function deps() {
    const store = memoryStore();
    return { store, deps: { fetchImpl: fetchStub(sites), save: store.save, namer: new KeyNamer() } };
}

test('a JPEG becomes a WebP row with a link, sizes and savings', async () => {
    const { store, deps: d } = deps();
    const input = normalizeInput({ urls: ['https://shop.example.com/img/Red%20Shoes.jpg'], width: 512 });
    const { row, failure } = await processUrl(input.urls[0], input, d);
    assert.equal(failure, undefined);
    assert.equal(row.key, 'Red-Shoes.webp');
    assert.equal(row.outputUrl, 'https://api.apify.com/v2/key-value-stores/test/records/Red-Shoes.webp');
    assert.equal(row.fileName, 'Red Shoes.jpg');
    assert.deepEqual([row.inputFormat, row.inputWidth, row.inputHeight], ['jpeg', 1024, 772]);
    assert.deepEqual([row.outputFormat, row.outputWidth, row.outputHeight], ['webp', 512, 386]);
    assert.equal(row.inputBytes, fixture('photo.jpg').length);
    assert.ok(row.savedPercent > 50, `saved ${row.savedPercent}%`);
    assert.equal(store.files.get('Red-Shoes.webp').contentType, 'image/webp');
    assert.equal(store.files.get('Red-Shoes.webp').buffer.length, row.outputBytes);
});

test('web pages and SVG are failures, not rows', async () => {
    const { store, deps: d } = deps();
    const input = normalizeInput({ urls: ['https://shop.example.com/', 'https://shop.example.com/icon.svg'] });
    const page = await processUrl(input.urls[0], input, d);
    assert.match(page.failure.error, /Not an image/);
    const svg = await processUrl(input.urls[1], input, d);
    assert.match(svg.failure.error, /Unsupported image type: SVG/);
    assert.equal(store.files.size, 0);
});

test('a failed save is a failure (not charged)', async () => {
    const { deps: d } = deps();
    d.save = async () => { throw new Error('store is full'); };
    const input = normalizeInput({ urls: ['https://shop.example.com/logo.png'] });
    const { failure } = await processUrl(input.urls[0], input, d);
    assert.match(failure.error, /Could not save.*store is full/);
});
