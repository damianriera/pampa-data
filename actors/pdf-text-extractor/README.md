## PDF Text Extractor: PDF to Text, Markdown and Metadata

**Extract the text of any PDF from its URL**, in bulk, as **plain text or Markdown** with headings kept, plus the **text of every page**, the **page count, title, author, subject, keywords, creation and modification dates, language, word count** and the **links** inside. Paste up to 10,000 PDF links and get **one clean row per PDF**, ready for **AI agents, RAG pipelines, search indexes and spreadsheets**.

No browser, no OCR bill: the text layer is read directly with Mozilla's pdf.js, so a 15-page paper takes about half a second and costs **$2 per 1,000 PDFs** whatever the page count. **Scanned PDFs without a text layer are detected, listed and not charged**, so you never pay for empty results.

Use it to:

- **feed LLMs and RAG pipelines**: Markdown output turns large-font lines into `#` headings and marks every page with `<!-- page N -->`, so chunking and citations by page are easy,
- **index reports, papers, manuals and policies** for search, with title, author, dates and language,
- **process invoices, statements and forms** in bulk and pass the text to your parser or AI model,
- **check a list of PDF links**: which ones still work, their size, page count and which are scans,
- **read only the pages you need** (`pageRange: "1-3"`) from long documents.

### What data you get

One row per PDF:

| Field | Example | Meaning |
| --- | --- | --- |
| `url`, `finalUrl`, `fileName` | `https://www.irs.gov/pub/irs-pdf/fw9.pdf`, `fw9.pdf` | The link you gave, where it ended after redirects, and the file name |
| `title`, `author`, `subject`, `keywords` | `Form W-9 (Rev. March 2024)` | Document properties (from the PDF info and XMP metadata) |
| `creator`, `producer`, `pdfVersion` | `LaTeX with hyperref`, `pdfTeX-1.40.25`, `1.5` | The software that made the PDF |
| `createdAt`, `modifiedAt` | `2024-03-06T13:18:13.000Z` | Dates in ISO 8601 (UTC) |
| `language`, `languageSource` | `es`, `document` | Language declared by the PDF, or `detected` from the text (en, es, pt, fr, de, it, nl) |
| `pageCount`, `pagesExtracted` | `39`, `39` | Pages in the file and pages read (after **Pages to read**) |
| `pagesWithoutText` | `[12, 13]` | Pages with no text layer, such as scanned inserts or full-page images |
| `wordCount`, `charCount` | `18492`, `119985` | Size of the extracted text |
| `text`, `textFormat`, `textTruncated` | `# Constitución Española.` ... | The full text in the format you chose |
| `pages` | `[{ "pageNumber": 1, "text": "...", "wordCount": 412 }]` | Only with **Text per page** |
| `links` | `["https://github.com/tensorflow/tensor2tensor"]` | Only with **Links in the PDF** |
| `isFillableForm`, `isEncrypted`, `fileSizeBytes` | `true`, `false`, `140815` | Form fields present, owner-password protection, file size |

PDFs that could not be read are listed in the `FAILED` record (key-value store, also in the Output tab) with the reason: unreachable, HTTP error, not a PDF (for example a login page), password-protected, damaged, too large, or **scanned without text** (with its page count and metadata). None of them are charged.

### How to use it

1. Paste PDF links in **PDF URLs**. Files you stored in an Apify key-value store work too: use the record URL (`https://api.apify.com/v2/key-value-stores/STORE_ID/records/KEY`); your run's own token is sent to api.apify.com only.
2. Choose **Plain text** or **Markdown**, and optionally **Text per page**, **Pages to read** and **Links in the PDF**.
3. Run it and export to JSON, CSV or Excel, or call it from the API, Make, Zapier or n8n.

Example input:

```json
{
    "urls": [
        "https://www.irs.gov/pub/irs-pdf/fw9.pdf",
        "https://arxiv.org/pdf/1706.03762",
        "https://www.boe.es/buscar/pdf/1978/BOE-A-1978-31229-consolidado.pdf"
    ],
    "textFormat": "markdown",
    "includePages": true,
    "pageRange": "1-10",
    "maxChars": 0
}
```

Example output item (text shortened):

```json
{
    "url": "https://pdfobject.com/pdf/sample.pdf",
    "finalUrl": "https://pdfobject.com/pdf/sample.pdf",
    "fileName": "sample.pdf",
    "title": "sample",
    "author": "Philip Hutchison",
    "creator": "Pages",
    "producer": "Mac OS X 10.5.4 Quartz PDFContext",
    "createdAt": "2008-07-01T05:24:47.000Z",
    "pdfVersion": "1.3",
    "pageCount": 1,
    "pagesExtracted": 1,
    "pagesWithoutText": [],
    "hasTextLayer": true,
    "fileSizeBytes": 18810,
    "wordCount": 416,
    "textFormat": "markdown",
    "text": "# Sample PDF\n\n## This is a simple PDF file. Fun fun fun.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit...",
    "textTruncated": false
}
```

### Pricing

You pay per PDF read: **$2 per 1,000 PDFs** ($0.002 per PDF), no start fee and no per-page fee. Scanned PDFs without text, password-protected or damaged files, web pages, broken links and files over your size limit are **not charged**. Set a maximum cost per run in Apify and the Actor stops cleanly when it is reached.

### How it works and limits

- One plain download per PDF (redirects followed), at most 2 at the same time from one website. Sites that block automated downloads are reported, not worked around.
- Text comes from the PDF's text layer. **There is no OCR**: scanned pages are listed in `pagesWithoutText`, and a PDF with no text at all goes to `FAILED` without a charge.
- Files up to 50 MB by default (**Maximum file size**, up to 200 MB). The default 512 MB memory handles PDFs of hundreds of pages; give the run 2 GB or more for files over 100 MB.
- Markdown headings come from font size (lines at least 15% larger than the body text). Tables come out as text lines, and multi-column layouts are read in the order the PDF stores them, which is usually the reading order.
- One dataset item holds up to 9 MB, so the text of a very long book is cut to fit (`textTruncated: true` and a `truncatedReason`); read it in parts with **Pages to read**.
- You are responsible for having the right to process the PDFs you send. The Actor does not store them; it only saves the extracted text in your own dataset.

### FAQ

**Can it read scanned PDFs?** Not in this version: it reads the text layer. Scanned PDFs are flagged (and not charged) so you can send only those to an OCR tool.

**Does it work with password-protected PDFs?** PDFs that only restrict printing or copying are read normally. PDFs that need a password to open are listed in `FAILED`.

**How do I split the Markdown by page?** Split on `<!-- page N -->`, or turn on **Text per page** to get a `pages` list.

### Related Actors

- [RSS Feed Reader and Atom Parser](https://apify.com/pampa-data/rss-feed-reader): get new reports and papers from feeds, then read their PDFs here.
- [SEO On-Page Audit and Meta Tag Checker](https://apify.com/pampa-data/seo-on-page-audit): audit the web pages that link to your PDFs.
- [Company Jobs Scraper](https://apify.com/pampa-data/company-jobs-scraper): open jobs from company career boards.
- [Website Tech Stack Detector](https://apify.com/pampa-data/website-tech-stack-detector): which CMS and tools a website uses.
- [Google Trends Scraper](https://apify.com/pampa-data/google-trends-scraper): interest over time for the topics in your documents.
