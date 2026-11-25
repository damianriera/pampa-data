# Changelog

## 0.1.0 (2026-11-25)

- First release: download PDFs from URLs (or Apify key-value store records) and extract their text with pdf.js (through `unpdf`, no browser, no OCR) as plain text or Markdown with headings from font size and page markers. Optional text per page, page range, maximum text length and links. Metadata: title, author, subject, keywords, creator, producer, creation and modification dates, PDF version, language (declared or detected), page count, pages without text, word and character counts, fillable form and encryption flags, file size and name. Scanned PDFs without a text layer, password-protected, damaged and non-PDF responses go to FAILED and are not charged. Rows that would exceed the 9 MB dataset item limit are shortened to fit.
