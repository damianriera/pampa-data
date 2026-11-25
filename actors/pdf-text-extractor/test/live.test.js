import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInput } from '../src/input.js';
import { processUrl } from '../src/process.js';

test('live: IRS Form W-9 from irs.gov', { skip: !process.env.LIVE }, async () => {
    const input = normalizeInput({ urls: ['https://www.irs.gov/pub/irs-pdf/fw9.pdf'], textFormat: 'markdown' });
    const { row, failure } = await processUrl(input.urls[0], input);
    assert.equal(failure, undefined, failure?.error);
    assert.match(row.title, /Form W-9/);
    assert.ok(row.pageCount >= 1 && row.wordCount > 1000);
});

test('live: a web page is reported as not a PDF', { skip: !process.env.LIVE }, async () => {
    const input = normalizeInput({ urls: ['https://www.irs.gov/forms-pubs/about-form-w-9'] });
    const { failure } = await processUrl(input.urls[0], input);
    assert.match(failure.error, /Not a PDF/);
});
