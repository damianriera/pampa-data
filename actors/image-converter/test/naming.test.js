import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseName, KeyNamer } from '../src/naming.js';

test('baseName keeps only key-safe characters and drops the extension', () => {
    assert.equal(baseName('Red Shoes (1).JPG'), 'Red-Shoes-(1)');
    assert.equal(baseName('café/über.png'), 'cafe-uber');
    assert.equal(baseName(null), 'image');
    assert.equal(baseName('???.png'), 'image');
});

test('KeyNamer makes repeated names unique and adds the prefix', () => {
    const namer = new KeyNamer('shop-');
    assert.equal(namer.next('photo.jpg', 'webp'), 'shop-photo.webp');
    assert.equal(namer.next('photo.png', 'webp'), 'shop-photo-2.webp');
    assert.equal(namer.next('PHOTO.gif', 'webp'), 'shop-PHOTO-3.webp');
    assert.equal(namer.next('photo.jpg', 'avif'), 'shop-photo.avif');
});

test('keys stay under the length limit', () => {
    const key = new KeyNamer().next(`${'a'.repeat(400)}.png`, 'webp');
    assert.ok(key.length <= 256);
    assert.match(key, /\.webp$/);
});
