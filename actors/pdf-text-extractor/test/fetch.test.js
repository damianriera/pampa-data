import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authHeaders, downloadPdf, fileNameOf, isPdf } from '../src/fetch.js';
import { fetchStub, fixture } from './helpers.js';

test('follows redirects and reads the file name', async () => {
    const pdf = fixture('dummy.pdf');
    const fetchImpl = fetchStub({
        'https://a.com/get?id=1': { redirectTo: '/files/report%202024.pdf' },
        'https://a.com/files/report%202024.pdf': { body: pdf },
    });
    const r = await downloadPdf('https://a.com/get?id=1', { fetchImpl });
    assert.equal(r.url, 'https://a.com/files/report%202024.pdf');
    assert.equal(r.fileName, 'report 2024.pdf');
    assert.equal(r.buffer.length, pdf.length);
});

test('rejects web pages, HTTP errors and files over the size cap', async () => {
    const fetchImpl = fetchStub({
        'https://a.com/page': { body: '<html>login</html>', headers: { 'content-type': 'text/html' } },
        'https://a.com/private.pdf': { body: 'no', status: 403, headers: { 'content-type': 'text/plain' } },
        'https://a.com/big.pdf': { body: fixture('fw9.pdf') },
    });
    await assert.rejects(downloadPdf('https://a.com/page', { fetchImpl }), /Not a PDF \(got a web page\)/);
    await assert.rejects(downloadPdf('https://a.com/private.pdf', { fetchImpl }), (e) => e.statusCode === 403 && /access denied/.test(e.message));
    await assert.rejects(downloadPdf('https://a.com/big.pdf', { fetchImpl, maxBytes: 100000 }), /larger than/);
    await assert.rejects(downloadPdf('https://a.com/missing.pdf', { fetchImpl }), /HTTP 404/);
});

test('the Apify token only goes to api.apify.com, never to a redirect target', async () => {
    const calls = [];
    const fetchImpl = fetchStub({
        'https://api.apify.com/v2/key-value-stores/abc/records/doc': { redirectTo: 'https://files.example.com/doc.pdf' },
        'https://files.example.com/doc.pdf': { body: fixture('dummy.pdf') },
    }, calls);
    await downloadPdf('https://api.apify.com/v2/key-value-stores/abc/records/doc', { fetchImpl, token: 'secret' });
    assert.equal(calls[0].headers.authorization, 'Bearer secret');
    assert.equal(calls[1].headers.authorization, undefined);
    assert.deepEqual(authHeaders('https://api.apify.com.evil.com/x', 'secret'), {});
    assert.deepEqual(authHeaders('http://api.apify.com/x', 'secret'), {});
});

test('helpers', () => {
    assert.equal(isPdf(Buffer.from('\n\n%PDF-1.7 ...')), true);
    assert.equal(isPdf(Buffer.from('<!doctype html>')), false);
    assert.equal(fileNameOf('https://a.com/x/y.pdf', 'attachment; filename="Q3 report.pdf"'), 'Q3 report.pdf');
    assert.equal(fileNameOf('https://a.com/x', "attachment; filename*=UTF-8''informe%20a%C3%B1o.pdf"), 'informe año.pdf');
    assert.equal(fileNameOf('https://a.com/', null), null);
});
