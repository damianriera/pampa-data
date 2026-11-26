import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInput } from '../src/input.js';
import { KeyNamer } from '../src/naming.js';
import { processUrl } from '../src/process.js';
import { memoryStore } from './helpers.js';

test('live: Wikimedia PNG to WebP and a web page refused', { skip: !process.env.LIVE }, async () => {
    const store = memoryStore();
    const input = normalizeInput({
        urls: [
            'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png',
            'https://www.gstatic.com/webp/gallery/4.jpg',
            'https://www.wikipedia.org/',
        ],
        width: 400,
    });
    const deps = { save: store.save, namer: new KeyNamer() };
    const png = await processUrl(input.urls[0], input, deps);
    assert.equal(png.failure, undefined, png.failure?.error);
    assert.equal(png.row.outputFormat, 'webp');
    assert.equal(png.row.outputWidth, 400);
    assert.equal(png.row.hasAlpha, true);
    const jpg = await processUrl(input.urls[1], input, deps);
    assert.equal(jpg.failure, undefined, jpg.failure?.error);
    assert.ok(jpg.row.savedPercent > 50);
    const page = await processUrl(input.urls[2], input, deps);
    assert.match(page.failure.error, /Not an image/);
});
