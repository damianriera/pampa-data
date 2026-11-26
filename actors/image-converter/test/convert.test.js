import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { convertImage } from '../src/convert.js';
import { normalizeInput } from '../src/input.js';
import { fixture } from './helpers.js';

const opts = (over = {}) => ({ ...normalizeInput({ urls: ['a.com/x'], ...over }) });

test('JPEG photo to WebP is smaller and keeps its size', async () => {
    const src = fixture('photo.jpg');
    const r = await convertImage(src, opts());
    assert.equal(r.input.format, 'jpeg');
    assert.equal(r.output.format, 'webp');
    assert.equal(r.output.contentType, 'image/webp');
    assert.deepEqual([r.output.width, r.output.height], [1024, 772]);
    assert.ok(r.output.bytes < src.length);
    assert.equal((await sharp(r.buffer).metadata()).format, 'webp');
});

test('resize inside a box keeps the aspect ratio and never enlarges', async () => {
    const r = await convertImage(fixture('photo.jpg'), opts({ width: 400, height: 400 }));
    assert.deepEqual([r.output.width, r.output.height], [400, 302]);
    const small = await convertImage(fixture('sample.webp'), opts({ width: 2000 }));
    assert.equal(small.output.width, 550);
});

test('cover crops to the exact size', async () => {
    const r = await convertImage(fixture('photo.jpg'), opts({ width: 300, height: 300, fit: 'cover', format: 'avif' }));
    assert.deepEqual([r.output.width, r.output.height], [300, 300]);
    assert.equal(r.output.extension, 'avif');
    assert.equal((await sharp(r.buffer).metadata()).compression, 'av1');
});

test('transparent PNG to JPEG is flattened on the background color', async () => {
    const r = await convertImage(fixture('transparent.png'), opts({ format: 'jpeg', background: '#ff0000' }));
    assert.equal(r.input.hasAlpha, true);
    const meta = await sharp(r.buffer).metadata();
    assert.equal(meta.format, 'jpeg');
    assert.equal(meta.hasAlpha, false);
});

test('transparent PNG to WebP keeps the alpha channel', async () => {
    const r = await convertImage(fixture('transparent.png'), opts());
    assert.equal((await sharp(r.buffer).metadata()).hasAlpha, true);
});

test('animated GIF: first frame by default, all frames with keepAnimation', async () => {
    const first = await convertImage(fixture('animated.gif'), opts());
    assert.ok(first.input.frames > 1);
    assert.equal(first.output.frames, 1);
    assert.deepEqual([first.output.width, first.output.height], [300, 200]);
    assert.equal((await sharp(first.buffer).metadata()).pages ?? 1, 1);

    const anim = await convertImage(fixture('animated.gif'), opts({ keepAnimation: true, width: 150 }));
    assert.equal(anim.output.frames, first.input.frames);
    assert.equal(anim.output.width, 150);
    assert.equal((await sharp(anim.buffer).metadata()).pages, first.input.frames);
});

test('"original" keeps the input format; TIFF input works', async () => {
    const tiff = await sharp(fixture('photo.jpg')).tiff().toBuffer();
    const r = await convertImage(tiff, opts({ format: 'original', width: 200 }));
    assert.equal(r.input.format, 'tiff');
    assert.equal(r.output.format, 'tiff');
    assert.equal(r.output.width, 200);
    const png = await convertImage(fixture('transparent.png'), opts({ format: 'png', quality: 60 }));
    assert.equal(png.output.format, 'png');
});

test('metadata is stripped unless asked to keep it', async () => {
    const withExif = await sharp(fixture('photo.jpg')).withExif({ IFD0: { Copyright: 'pampa-data test' } }).jpeg().toBuffer();
    const stripped = await convertImage(withExif, opts({ format: 'jpeg' }));
    assert.equal((await sharp(stripped.buffer).metadata()).exif, undefined);
    const kept = await convertImage(withExif, opts({ format: 'jpeg', keepMetadata: true }));
    assert.ok((await sharp(kept.buffer).metadata()).exif);
});

test('EXIF orientation is applied (portrait photo comes out portrait)', async () => {
    const rotated = await sharp(fixture('photo.jpg')).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const r = await convertImage(rotated, opts());
    assert.deepEqual([r.input.width, r.input.height], [772, 1024]);
    assert.deepEqual([r.output.width, r.output.height], [772, 1024]);
});

test('images over the megapixel cap and broken files are refused', async () => {
    const big = await sharp({ create: { width: 1200, height: 1000, channels: 3, background: '#000' } }).png().toBuffer();
    await assert.rejects(convertImage(big, opts({ maxMegapixels: 1 })), /1\.2 megapixels, over the 1 MP limit/);
    await assert.rejects(convertImage(fixture('photo.jpg').subarray(0, 2000), opts()), /Could not (read|convert)/);
});

test('estimateOutputSize matches sharp for each fit', async () => {
    const { estimateOutputSize } = await import('../src/convert.js');
    const cases = [
        { width: 400 }, { height: 300 }, { width: 400, height: 400, fit: 'inside' }, { width: 400, height: 400, fit: 'cover' },
        { width: 400, height: 400, fit: 'outside' }, { width: 2000 }, { width: 2000, height: 100, fit: 'inside' },
    ];
    for (const c of cases) {
        const o = { fit: 'inside', withoutEnlargement: true, ...c };
        const r = await convertImage(fixture('photo.jpg'), opts({ ...c, format: 'png', quality: 100 }));
        assert.deepEqual(estimateOutputSize(1024, 772, o), { width: r.output.width, height: r.output.height }, JSON.stringify(c));
    }
});

test('AVIF that would not fit in the run memory is refused before encoding', async () => {
    const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#123456' } }).jpeg().toBuffer();
    await assert.rejects(convertImage(big, opts({ format: 'avif', memoryMb: 512 })), /AVIF output of 4000x3000 \(12\.0 MP\) needs about 630 MB/);
    const r = await convertImage(big, opts({ format: 'avif', width: 1600, memoryMb: 512 }));
    assert.deepEqual([r.output.width, r.output.height], [1600, 1200]);
});

test('AVIF quality follows the JPEG-like scale and beats WebP on photos', async () => {
    const { avifQuality } = await import('../src/convert.js');
    assert.deepEqual([avifQuality(80), avifQuality(100), avifQuality(40), avifQuality(1)], [50, 100, 25, 1]);
    const avif = await convertImage(fixture('photo.jpg'), opts({ format: 'avif' }));
    const webp = await convertImage(fixture('photo.jpg'), opts({ format: 'webp' }));
    assert.ok(avif.output.bytes < webp.output.bytes, `avif ${avif.output.bytes} vs webp ${webp.output.bytes}`);
});
