// Reads one PDF with pdf.js (through unpdf, no browser and no native code) into the row users get.
import { getDocumentProxy } from 'unpdf';

import { guessLanguage, normalizeLanguage } from './language.js';
import { keywordList, parsePdfDate, str } from './meta.js';
import { selectPages } from './input.js';
import { buildLines, countWords, linesToText, pagesToMarkdown, truncate } from './text.js';

/** A page with fewer letters or digits than this has no usable text layer (a scan, a photo or a blank page). */
export const MIN_PAGE_CHARS = 10;

export class PdfError extends Error {}

/** pdf.js errors -> a short reason for the FAILED record. */
export function pdfErrorMessage(err) {
    const name = err?.name ?? '';
    if (name === 'PasswordException') return 'Password-protected PDF (needs a password to open)';
    if (name === 'InvalidPDFException') return 'Damaged or invalid PDF';
    if (name === 'MissingPDFException') return 'Empty or missing PDF';
    return err?.message ?? String(err);
}

/** Frees the document's memory (pdf.js keeps fonts and parsed objects until the loading task is destroyed). */
async function close(pdf) {
    try {
        await (pdf.loadingTask?.destroy?.() ?? pdf.destroy?.());
    } catch { /* already closed */ }
}

const meaningfulChars = (text) => (text.match(/[\p{L}\p{N}]/gu) ?? []).length;

function withTimeout(promise, ms, onTimeout) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => {
                onTimeout?.();
                reject(new PdfError(`Took longer than ${Math.round(ms / 1000)} s to read`));
            }, ms);
        }),
    ]).finally(() => clearTimeout(timer));
}

async function readPages(pdf, pageNumbers, includeLinks) {
    const pages = [];
    for (const pageNumber of pageNumbers) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const lines = buildLines(content.items);
        let links = [];
        if (includeLinks) {
            const annotations = await page.getAnnotations();
            links = annotations.filter((a) => a.subtype === 'Link' && typeof a.url === 'string' && /^https?:/i.test(a.url)).map((a) => a.url);
        }
        page.cleanup();
        pages.push({ pageNumber, lines, links });
    }
    return pages;
}

/**
 * Parse a PDF buffer. Returns { hasTextLayer, row } where row is the dataset item (or the details for the
 * FAILED record when there is no text layer).
 */
export async function extractPdf(buffer, options = {}) {
    const {
        textFormat = 'text', includePages = false, includeLinks = false, pageRanges = [], maxPages = 2000,
        maxChars = 0, timeoutMs = 300000,
    } = options;
    let pdf;
    try {
        pdf = await getDocumentProxy(new Uint8Array(buffer), {
            maxImageSize: 16_777_216, // images are not decoded for text, but never let one allocate gigabytes
            isEvalSupported: false,
            disableFontFace: true,
            verbosity: 0,
        });
    } catch (err) {
        throw new PdfError(pdfErrorMessage(err));
    }
    try {
        return await withTimeout(readDocument(pdf, buffer.length, {
            textFormat, includePages, includeLinks, pageRanges, maxPages, maxChars,
        }), timeoutMs, () => close(pdf));
    } finally {
        await close(pdf);
    }
}

async function readDocument(pdf, fileSizeBytes, { textFormat, includePages, includeLinks, pageRanges, maxPages, maxChars }) {
    const pageCount = pdf.numPages;
    const selected = selectPages(pageRanges, pageCount);
    const pageNumbers = selected.slice(0, maxPages);
    if (!pageNumbers.length) throw new PdfError(`The page range selects no pages (the PDF has ${pageCount})`);

    const { info = {}, metadata } = await pdf.getMetadata().catch(() => ({}));
    const xmp = (key) => {
        try {
            return metadata?.get?.(key) ?? null;
        } catch {
            return null;
        }
    };

    const pages = await readPages(pdf, pageNumbers, includeLinks);
    const pageTexts = pages.map((p) => linesToText(p.lines));
    const pagesWithoutText = pages.filter((_, i) => meaningfulChars(pageTexts[i]) < MIN_PAGE_CHARS).map((p) => p.pageNumber);
    const hasTextLayer = pagesWithoutText.length < pages.length;  // at least one page has real text

    const plain = pageTexts.filter(Boolean).join('\n\n');
    const full = textFormat === 'markdown' ? pagesToMarkdown(pages.map((p) => p.lines), pageNumbers) : plain;
    const { text, truncated } = truncate(full, maxChars);

    const declaredLanguage = normalizeLanguage(str(info.Language) ?? str(xmp('dc:language')));
    const title = str(info.Title) ?? str(xmp('dc:title'));

    const row = {
        title,
        author: str(info.Author) ?? str(xmp('dc:creator')),
        subject: str(info.Subject) ?? str(xmp('dc:description')),
        keywords: keywordList(info.Keywords),
        creator: str(info.Creator),
        producer: str(info.Producer),
        createdAt: parsePdfDate(info.CreationDate) ?? parsePdfDate(xmp('xmp:createdate')),
        modifiedAt: parsePdfDate(info.ModDate) ?? parsePdfDate(xmp('xmp:modifydate')),
        pdfVersion: str(info.PDFFormatVersion),
        language: declaredLanguage ?? guessLanguage(plain),
        languageSource: declaredLanguage ? 'document' : (guessLanguage(plain) ? 'detected' : null),
        pageCount,
        pagesExtracted: pageNumbers.length,
        pagesWithoutText,
        hasTextLayer,
        isFillableForm: Boolean(info.IsAcroFormPresent || info.IsXFAPresent),
        isEncrypted: Boolean(str(info.EncryptFilterName)),
        fileSizeBytes,
        wordCount: countWords(plain),
        charCount: plain.length,
        textFormat,
        text,
        textTruncated: truncated,
    };
    if (includePages) {
        row.pages = pages.map((p, i) => ({ pageNumber: p.pageNumber, text: pageTexts[i], wordCount: countWords(pageTexts[i]) }));
    }
    if (includeLinks) row.links = [...new Set(pages.flatMap((p) => p.links))];
    if (selected.length > pageNumbers.length) row.pagesSkippedByLimit = selected.length - pageNumbers.length;
    return { hasTextLayer, row };
}
