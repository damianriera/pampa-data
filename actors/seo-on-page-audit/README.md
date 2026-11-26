## SEO Audit Tool: Bulk On-Page SEO and Meta Tag Checker

**A bulk SEO audit tool and meta tag checker** for whole sitemaps, not one page at a time. Pay $2 per 1,000 pages.

Audit the on-page SEO of **thousands of pages at once**. Paste a list of URLs, or just a website, and get one row per page with its **status code, redirect chain, title and meta description (with lengths), canonical, noindex, robots.txt, hreflang, H1 and H2 headings, word count, Open Graph and Twitter tags, JSON-LD structured data, image alt text and links**, plus a plain-English **list of issues** to fix.

Give a website or a sitemap and the Actor finds the sitemaps itself (from robots.txt or `/sitemap.xml`, including sitemap indexes and `.gz` files) and audits every page in it. A site summary lists how many pages have each issue and which pages **share the same title or meta description**.

No browser, one plain request per page, so it is fast and cheap: **$2 per 1,000 pages**, about 20 times less than the popular all-in-one audit tools.

Use it to:

- **audit a client's site** before a proposal or after a migration: missing titles, duplicate descriptions, noindex left on, broken canonicals, redirect chains,
- **check a list of URLs** from Google Search Console, a crawl or a spreadsheet,
- **monitor key pages** on a schedule and catch an accidental `noindex` or a 404 the day it happens,
- **compare competitors' pages**: title length, word count, headings and structured data,
- **feed AI and content tools** with clean page metadata.

### What data you get

One row per page:

| Field | Example | Meaning |
| --- | --- | --- |
| `url`, `finalUrl` | `http://python.org/` → `https://www.python.org/` | Requested page and where it ended up |
| `statusCode`, `redirectCount`, `redirectChain` | `200`, `1`, `[{ "url": "http://python.org/", "statusCode": 301 }]` | Every redirect hop |
| `responseTimeMs`, `pageSizeKb` | `310`, `51.1` | Server speed and HTML size |
| `indexable` | `true` | 200, HTML, no noindex, not blocked by robots.txt, canonical not pointing elsewhere |
| `issues`, `issueCount`, `issuesText` | `["title_too_short", "multiple_h1"]` | What to fix (codes and plain text, see below) |
| `title`, `titleLength` | `Welcome to Python.org`, `21` | Title tag |
| `metaDescription`, `metaDescriptionLength` | `The official home of ...`, `52` | Meta description |
| `canonical`, `canonicalIsSelf` | `https://example.com/a`, `true` | Canonical link (tag or HTTP header) |
| `metaRobots`, `xRobotsTag`, `noindex`, `nofollow` | `noindex, follow` | Robots directives |
| `robotsTxtAllowed` | `true` | Whether robots.txt lets Googlebot crawl the page |
| `lang`, `hreflang` | `en`, `[{ "lang": "es", "url": "..." }]` | Language and alternates |
| `h1`, `h1Count`, `h2`, `h2Count`, `headingCounts` | `["Pricing"]` | Headings |
| `wordCount` | `957` | Visible words on the page |
| `openGraph`, `twitterCard` | `{ "title": "...", "image": "..." }` | Social preview tags |
| `jsonLdTypes`, `jsonLdInvalidBlocks` | `["Organization", "Product"]` | Structured data types found, and broken JSON-LD blocks |
| `imageCount`, `imagesMissingAlt`, `imagesEmptyAlt` | `12`, `3`, `1` | Image alt text coverage |
| `internalLinkCount`, `externalLinkCount`, `nofollowLinkCount` | `64`, `12`, `0` | Links on the page (turn on **Include link lists** to get every link with its anchor text) |
| `viewport`, `charset`, `server`, `lastModified`, `xFrameOptions` | | Technical basics |

#### Issues checked

| Code | Meaning |
| --- | --- |
| `http_error` | Page does not return 200 |
| `redirected`, `redirect_chain` | URL redirects once, or more than once |
| `insecure_http` | Final page is not on HTTPS |
| `slow_response` | Server took more than 1.5 s |
| `title_missing`, `title_too_long`, `title_too_short`, `multiple_titles` | Title tag missing, over 60 or under 30 characters, or repeated |
| `description_missing`, `description_too_long`, `description_too_short` | Meta description missing, over 160 or under 70 characters |
| `h1_missing`, `multiple_h1` | No H1 or more than one |
| `canonical_missing`, `canonical_other_page`, `multiple_canonicals` | Canonical problems |
| `noindex`, `blocked_by_robots_txt` | Page kept out of search engines |
| `lang_missing`, `viewport_missing` | No `lang` attribute or mobile viewport |
| `images_missing_alt` | Images without an `alt` attribute |
| `low_word_count` | Fewer than 300 words |
| `og_missing`, `structured_data_missing` | No Open Graph title/image, no JSON-LD |

#### Site summary

The `SUMMARY` record (in the run's key-value store and the Output tab) has the number of pages audited and indexable, the average response time, how many pages have each issue, and the groups of indexable pages that share the same title or meta description.

### How to use it

1. Paste page URLs in **Page URLs**, and/or a website or sitemap in **Websites or sitemaps to audit in full**.
2. Optionally set **Maximum pages** and a URL filter such as `/blog/` to audit one section.
3. Run it and export to JSON, CSV or Excel, or call it from the API, Make, Zapier or n8n. Schedule it to watch your key pages.

Example input:

```json
{
    "urls": ["https://www.python.org/", "http://wordpress.org/"],
    "sitemapUrls": ["example.com"],
    "sitemapUrlFilter": "/blog/",
    "maxPages": 500
}
```

### Pricing

You pay per page audited: **$2 per 1,000 pages** ($0.002 per page). Pages that answer 404 or 500 are audited and charged like any page (finding them is part of the audit). Pages that block automated requests (401, 403, 429, 503), unreachable pages, files that are not web pages (images, PDFs, videos listed in a sitemap), invalid URLs and sitemap errors are listed in the `FAILED` record and **not charged**. Set a maximum cost per run in Apify and the Actor stops cleanly when it is reached.

### How it works and limits

- One plain HTTP request per page (up to 5 MB of HTML), redirects followed one by one so every hop is recorded, and robots.txt read once per website.
- No browser: the audit sees the HTML the server sends. Titles or meta tags added later by JavaScript on single-page apps are not seen (Google often sees them after rendering).
- Polite: at most 3 requests at the same time to one website. Up to 10,000 pages per run.
- Some sites block automated requests. They are reported as failed and not charged; we do not try to get around a site's blocking. Audit your own sites and your clients' sites freely.
- Thresholds (60/30 characters for titles, 160/70 for descriptions, 300 words) follow common SEO tool defaults; use the length fields to apply your own.

### FAQ

**Is it a Screaming Frog or Ahrefs Site Audit alternative?** For on-page checks, yes: titles, meta descriptions, canonicals, noindex, headings, hreflang, structured data and redirects for up to 10,000 pages per run, with no desktop app or subscription. Auditing 1,000 pages costs $2. It does not measure backlinks, Core Web Vitals or rankings.

**Can I audit a whole website without a list of URLs?** Yes. Put the domain (for example `example.com`) in **Websites or sitemaps to audit in full** and the Actor finds the sitemap from robots.txt or `/sitemap.xml` and audits every page in it. Use the URL filter to audit only one section, such as `/blog/`.

**Does it see content rendered by JavaScript?** No. It audits the HTML the server sends, which is what most crawlers see first. If a single-page app adds its title or meta tags with JavaScript, those pages show `title_missing` or similar issues, which is worth knowing too.

**How do I get alerted when a page gets `noindex` or breaks?** Schedule the Actor daily on your key pages and send the results to Slack, e-mail, Google Sheets or a webhook with Apify integrations, Make, Zapier or n8n. Filter on `indexable` = false or `issueCount` > 0.

### Related Actors

- [Website Popularity Rank Checker](https://apify.com/pampa-data/website-popularity-rank): Tranco top 1M rank and trend of the same websites, to see how big a site or competitor is.
- [Website Tech Stack Detector](https://apify.com/pampa-data/website-tech-stack-detector): CMS, analytics, CDN and frameworks of the sites you audit.
- [Keyword Suggestions Scraper](https://apify.com/pampa-data/keyword-suggestions-scraper): Google, YouTube and Bing autocomplete ideas for the titles and headings you write.
- [Google Trends Scraper](https://apify.com/pampa-data/google-trends-scraper): interest over time for the keywords your pages target.
