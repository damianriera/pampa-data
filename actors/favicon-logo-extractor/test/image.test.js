import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeImage } from '../src/image.js';
import { fixture } from './helpers.js';

test('describeImage reads real PNG, ICO (largest frame) and SVG files', () => {
    assert.deepEqual(describeImage(fixture('apify_icon6.png')), { type: 'png', mimeType: 'image/png', width: 128, height: 128, frames: undefined });
    const ico = describeImage(fixture('apify_favicon.ico'));
    assert.equal(ico.type, 'ico');
    assert.equal(ico.width, 48);
    assert.ok(ico.frames.includes('32x32'));
    const svg = describeImage(fixture('apify_symbol.svg'));
    assert.equal(svg.type, 'svg');
    assert.equal(svg.mimeType, 'image/svg+xml');
});

test('describeImage returns null for HTML pages served instead of an icon', () => {
    assert.equal(describeImage(Buffer.from('<!doctype html><html><body>Not found</body></html>')), null);
    assert.equal(describeImage(Buffer.alloc(0)), null);
});
