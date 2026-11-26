import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePageRange } from '../src/input.js';
import { extractPdf, PdfError, pdfErrorMessage } from '../src/pdf.js';
import { fixture } from './helpers.js';

test('IRS Form W-9: metadata, fillable form, English, Markdown headings', async () => {
    const { hasTextLayer, row } = await extractPdf(fixture('fw9.pdf'), { textFormat: 'markdown' });
    assert.equal(hasTextLayer, true);
    assert.equal(row.title, 'Form W-9 (Rev. March 2024)');
    assert.equal(row.subject, 'Request for Taxpayer Identification Number and Certification');
    assert.deepEqual(row.keywords, ['Fillable']);
    assert.equal(row.pageCount, 6);
    assert.equal(row.pagesExtracted, 6);
    assert.equal(row.isFillableForm, true);
    assert.equal(row.createdAt, '2024-03-06T13:18:13.000Z');
    assert.equal(row.language, 'en');
    assert.equal(row.languageSource, 'document');
    assert.ok(row.text.startsWith('<!-- page 1 -->\n\n# Form W-9 (Rev. March 2024)\n\n# Request for Taxpayer Identification Number and Certification'));
    assert.match(row.text, /<!-- page 6 -->/);
    assert.ok(row.wordCount > 5000);
    assert.equal(row.textTruncated, false);
    assert.equal(row.pages, undefined);
});

test('Spanish Constitution (BOE): page range, per-page text, truncation', async () => {
    const { row } = await extractPdf(fixture('boe-constitucion.pdf'), {
        pageRanges: parsePageRange('2-3'), includePages: true, maxChars: 500,
    });
    assert.equal(row.title, 'Constitución Española.');
    assert.equal(row.author, 'Agencia Estatal Boletín Oficial del Estado');
    assert.equal(row.language, 'es');
    assert.equal(row.pageCount, 39);
    assert.equal(row.pagesExtracted, 2);
    assert.deepEqual(row.pages.map((p) => p.pageNumber), [2, 3]);
    assert.ok(row.pages[1].text.includes('Preámbulo') || row.pages[1].text.includes('PREÁMBULO'));
    assert.ok(row.text.length <= 500);
    assert.equal(row.textTruncated, true);
    assert.ok(row.charCount > 500);
});

test('plain text with a page limit, and the language detected from the text', async () => {
    const { row } = await extractPdf(fixture('pdfobject-sample.pdf'), { maxPages: 1 });
    assert.equal(row.title, 'sample');
    assert.equal(row.author, 'Philip Hutchison');
    assert.ok(row.text.startsWith('Sample PDF\nThis is a simple PDF file. Fun fun fun.\nLorem ipsum'));
    assert.equal(row.wordCount, 416);
});

test('a tiny text PDF still counts as text', async () => {
    const { hasTextLayer, row } = await extractPdf(fixture('dummy.pdf'));
    assert.equal(hasTextLayer, true);
    assert.equal(row.text, 'Dummy PDF file');
    assert.deepEqual(row.pagesWithoutText, []);
});

test('an image-only PDF has no text layer', async () => {
    const { hasTextLayer, row } = await extractPdf(fixture('scanned.pdf'));
    assert.equal(hasTextLayer, false);
    assert.deepEqual(row.pagesWithoutText, [1]);
    assert.equal(row.wordCount, 0);
});

test('broken files and empty page ranges are reported', async () => {
    await assert.rejects(extractPdf(Buffer.from('%PDF-1.4\nthis is not really a pdf')), PdfError);
    await assert.rejects(extractPdf(fixture('dummy.pdf'), { pageRanges: parsePageRange('5-') }), /selects no pages \(the PDF has 1\)/);
    const err = new Error('No password given');
    err.name = 'PasswordException';
    assert.match(pdfErrorMessage(err), /Password-protected/);
});
