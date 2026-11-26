import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authHeaders, downloadImage, fileNameOf, sniffImage } from '../src/fetch.js';
import { fetchStub, fixture } from './helpers.js';

test('sniffImage recognises real files by their first bytes', () => {
    assert.equal(sniffImage(fixture('photo.jpg')), 'jpeg');
    assert.equal(sniffImage(fixture('transparent.png')), 'png');
    assert.equal(sniffImage(fixture('animated.gif')), 'gif');
    assert.equal(sniffImage(fixture('sample.webp')), 'webp');
    assert.equal(sniffImage(fixture('page.html')), null);
    assert.equal(sniffImage(Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>')), 'svg');
});

test('follows redirects and takes the file name from the final URL', async () => {
    const fetchImpl = fetchStub({
        'https://cdn.example.com/i/1': { redirectTo: '/files/Red%20Shoes.png' },
        'https://cdn.example.com/files/Red%20Shoes.png': { body: fixture('transparent.png') },
    });
    const file = await downloadImage('https://cdn.example.com/i/1', { fetchImpl });
    assert.equal(file.url, 'https://cdn.example.com/files/Red%20Shoes.png');
    assert.equal(file.fileName, 'Red Shoes.png');
    assert.equal(file.type, 'png');
});

test('web pages and HTTP errors are reported', async () => {
    const fetchImpl = fetchStub({
        'https://a.com/page': { body: fixture('page.html'), headers: { 'content-type': 'text/html' } },
        'https://a.com/blocked.png': { status: 403, body: 'no' },
    });
    await assert.rejects(downloadImage('https://a.com/page', { fetchImpl }), /Not an image \(got a web page\)/);
    await assert.rejects(downloadImage('https://a.com/blocked.png', { fetchImpl }), /HTTP 403 \(access denied/);
    await assert.rejects(downloadImage('https://a.com/missing.png', { fetchImpl }), /HTTP 404/);
});

test('files over the size cap are refused', async () => {
    const fetchImpl = fetchStub({ 'https://a.com/big.jpg': { body: fixture('photo.jpg'), headers: { 'content-type': 'image/jpeg' } } });
    await assert.rejects(downloadImage('https://a.com/big.jpg', { fetchImpl, maxBytes: 1000 }), /larger than/);
});

test('the token goes to api.apify.com only', async () => {
    assert.deepEqual(authHeaders('https://api.apify.com/v2/key-value-stores/x/records/a', 't'), { authorization: 'Bearer t' });
    assert.deepEqual(authHeaders('https://example.com/a.png', 't'), {});
    assert.deepEqual(authHeaders('http://api.apify.com/a', 't'), {});
});

test('fileNameOf reads Content-Disposition', () => {
    assert.equal(fileNameOf('https://a.com/x', 'attachment; filename="logo.png"'), 'logo.png');
    assert.equal(fileNameOf('https://a.com/x', "attachment; filename*=UTF-8''caf%C3%A9.jpg"), 'café.jpg');
    assert.equal(fileNameOf('https://a.com/', null), null);
});
