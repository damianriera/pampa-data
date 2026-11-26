// One URL -> { row } (a dataset item, charged) or { failure } (FAILED record, not charged).
import { downloadPdf } from './fetch.js';
import { extractPdf, PdfError } from './pdf.js';
import { truncate } from './text.js';

export const NO_TEXT_REASON = 'No text layer: scanned or image-only PDF (OCR is not included, so it is not charged)';

/** Apify rejects dataset items over 9 MB; stay under it with room for the other fields. */
export const MAX_ITEM_BYTES = 8_500_000;

/** Shortens text (and per-page text) until the row fits in one dataset item. */
export function fitItem(row, maxBytes = MAX_ITEM_BYTES) {
    let size = Buffer.byteLength(JSON.stringify(row));
    for (let i = 0; size > maxBytes && i < 5; i++) {
        const ratio = (maxBytes / size) * 0.95;
        row.text = truncate(row.text, Math.floor(row.text.length * ratio)).text;
        if (row.pages) {
            for (const p of row.pages) p.text = truncate(p.text, Math.floor(p.text.length * ratio)).text;
        }
        row.textTruncated = true;
        row.truncatedReason = 'The text is longer than one dataset item can hold (9 MB); use pageRange to read the rest';
        size = Buffer.byteLength(JSON.stringify(row));
    }
    return row;
}

export async function processUrl(url, input, { fetchImpl, limiter, token } = {}) {
    let file;
    try {
        const download = () => downloadPdf(url, { fetchImpl, token, maxBytes: input.maxFileSizeMb * 1048576 });
        file = limiter ? await limiter.run(new URL(url).host, download) : await download();
    } catch (err) {
        return { failure: { url, statusCode: err.statusCode ?? null, error: err.message } };
    }
    let result;
    try {
        result = await extractPdf(file.buffer, input);
    } catch (err) {
        const error = err instanceof PdfError ? err.message : `Could not read the PDF: ${err.message}`;
        return { failure: { url, finalUrl: file.url, error } };
    }
    file.buffer = null;
    const row = { url, finalUrl: file.url, fileName: file.fileName, ...result.row };
    if (!result.hasTextLayer) {
        const { text, pages, textTruncated, textFormat, ...details } = row;
        return { failure: { ...details, error: NO_TEXT_REASON } };
    }
    return { row: fitItem(row) };
}
