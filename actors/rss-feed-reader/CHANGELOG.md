# Changelog

## 0.1.0 (2026-11-24)

- First release: read RSS 2.0/0.9x, RSS 1.0 (RDF), Atom and JSON Feed URLs, or website addresses whose feed is found from the page's `<link rel="alternate">` tags or the usual feed paths. One row per item with title, link, published and updated dates, author (e-mail addresses removed), categories, summary, optional full content as text or HTML, image, enclosure (podcast audio) with size and duration, comments link and feed details. Filters by date (`publishedAfter`, absolute or "7 days") and keywords (include and exclude, accents ignored), newest first per feed, per-feed and total limits, dedup across feeds by link without tracking parameters. A FEEDS record describes every feed read; blocked, unreachable and feedless URLs go to FAILED and are not charged.
