import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInput } from '../src/input.js';
import { fitItem, NO_TEXT_REASON, processUrl } from '../src/process.js';
import { fetchStub, fixture } from './helpers.js';

const fetchImpl = fetchStub({
    'https://a.com/fw9.pdf': { body: fixture('fw9.pdf') },
    'https://a.com/scan.pdf': { body: fixture('scanned.pdf') },
    'https://a.com/broken.pdf': { body: '%PDF-1.4 junk' },
});
const input = normalizeInput({ urls: ['a.com/fw9.pdf'], includeLinks: true });

test('a PDF with text becomes one dataset row', async () => {
    const { row, failure } = await processUrl('https://a.com/fw9.pdf', input, { fetchImpl });
    assert.equal(failure, undefined);
    assert.equal(row.url, 'https://a.com/fw9.pdf');
    assert.equal(row.fileName, 'fw9.pdf');
    assert.deepEqual(Object.keys(row).slice(0, 4), ['url', 'finalUrl', 'fileName', 'title']);
    assert.ok(Array.isArray(row.links));
});

test('scanned, broken and missing PDFs are failures (not charged)', async () => {
    const scan = await processUrl('https://a.com/scan.pdf', input, { fetchImpl });
    assert.equal(scan.row, undefined);
    assert.equal(scan.failure.error, NO_TEXT_REASON);
    assert.equal(scan.failure.pageCount, 1);
    assert.equal(scan.failure.text, undefined);
    const broken = await processUrl('https://a.com/broken.pdf', input, { fetchImpl });
    assert.ok(broken.failure.error);
    const missing = await processUrl('https://a.com/none.pdf', input, { fetchImpl });
    assert.equal(missing.failure.statusCode, 404);
});

test('rows larger than a dataset item are shortened to fit', () => {
    const big = 'word '.repeat(3000);
    const row = { url: 'u', text: big, textTruncated: false, pages: [{ pageNumber: 1, text: big }] };
    fitItem(row, 10000);
    assert.ok(Buffer.byteLength(JSON.stringify(row)) <= 10000);
    assert.equal(row.textTruncated, true);
    assert.match(row.truncatedReason, /9 MB/);
    const small = { url: 'u', text: 'hi', textTruncated: false };
    assert.deepEqual(fitItem({ ...small }), small);
});
