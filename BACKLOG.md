# Actor backlog

The Builder routine takes the first item under **Approved** that has no open PR, builds it, and moves it to **Built**.
The Niche Scout routine adds scored ideas under **Proposed** every Monday. To approve one, move it under **Approved**
(edit this file on GitHub or tell Claude in the project chat).

Rules for every idea: public data only, no logins, no personal data, no bypassing a site's bot blocking or terms.

## Approved

_Approved by Damián on 2026-11-16 (ideas 3 to 6 from the 2026-11-12 Scout, 8 and 9 from the 2026-11-16 Scout), in build order.
Idea 8 (SEO On-Page Audit) was built on 2026-11-23 and idea 9 (RSS and Atom Feed Reader) on 2026-11-24. Ideas 3 (Remote Jobs Aggregator, 2026-11-17) and 4 (Substack Newsletter Posts Scraper, 2026-11-18) were rejected by
the Builder; see **Rejected**._

_Approved by Damián on 2026-11-22 (ideas 13 to 15 from the 2026-11-19 Scout), built after 8 and 9 in this order._

### 13. PDF Text and Metadata Extractor
- What: give PDF URLs (or files in a key-value store); returns one row per PDF with full text (plain or Markdown-ish with
  page breaks), per-page text, page count, title, author field, creation/modification dates, producer, language guess,
  word count, and a `hasTextLayer` flag so scanned PDFs are reported, not charged. Optional page range and max chars.
  Good for RAG/LLM pipelines, invoices and reports.
- Scores: demand 4, competition 3, access 5, legal 5, cost 4.
- Main competitor: memo23/pdf-text-extractor, 196 users, 5.0 (2 reviews), $0.005 per PDF + $0.005 per start (OCR
  $0.015/page). automation-lab/pdf-text-extractor has 117 users, no reviews, $0.003 per PDF + $0.005 start;
  gochujang (37 users) charges $0.005 per PDF + $0.001 per page.
- Access: plain download of the user's URLs (an arXiv PDF returned 200 `application/pdf`). Parsing with `unpdf`
  (MIT, pdf.js based), no browser. No OCR in v1 (that is where the leaders' cost goes).
- Suggested price: $0.002 per PDF, no start fee. Expected users: 25 to 40 per month.

### 14. Image Converter and Resizer
- What: bulk convert and resize images from URLs: JPEG, PNG, WebP, AVIF, GIF (first frame) and TIFF in; WebP, AVIF,
  JPEG or PNG out, with width/height/fit, quality, strip metadata, and the result saved to the key-value store with a
  public link, plus original vs new size in the dataset. For ecommerce catalogs and site speed work.
- Scores: demand 3, competition 4, access 5, legal 5, cost 4.
- Main competitor: marielise.dev/image-converter, 92 users, no reviews, last updated 2026-09-14, $0.002 to $0.12 per
  image by size. Others are small: gazidev (5 users, $0.0008), conserving_celerytop (3 users, $0.003 + $0.01 start).
- Access: the user's own image URLs; processing with `sharp` (Apache-2.0). Images over a size cap (for example
  25 MB or 40 megapixels) are skipped and not charged so 256 to 512 MB memory is enough.
- Suggested price: $0.001 per image. Expected users: 15 to 25 per month.

### 15. Website Favicon and Logo Extractor
- What: for a list of domains, find the favicon (all sizes), apple-touch-icon, web manifest icons, `og:image`, JSON-LD
  `logo`, SVG logo in the header when obvious, and `theme-color`, with each image's URL, size and type, plus the best
  pick. Optional download to the key-value store. For CRMs, lead lists and directories; cross-sells with our Website
  Popularity Rank Checker and Tech Stack Detector.
- Scores: demand 3, competition 4, access 4, legal 5, cost 5.
- Main competitor: benthepythondev/favicon-extractor, 60 users, no reviews, $0.0018 per site + $0.005 start.
  coder_luffy/website-logo-finder has 5 stars (9 reviews) but only 8 users now, $0.008 per site.
- Access: one plain GET of the homepage plus small icon requests. Sites that block plain requests are reported as
  failed and not charged.
- Suggested price: $0.0008 per website. Expected users: 15 to 25 per month.

_Approved by Damián on 2026-11-25 (ideas 18 to 20 from the 2026-11-23 Scout), built after 13 to 15 in this order._

### 18. Website Screenshot Generator
- What: screenshots of a list of URLs with Playwright: viewport or full page, device presets (desktop, tablet, phone),
  PNG/JPEG/WebP, quality, wait for selector or delay, hide cookie banners with a CSS list, dark mode, optional PDF.
  Each file saved to the key-value store with a public link; the dataset row has URL, final URL, status, title, size.
- Scores: demand 5, competition 3, access 4, legal 5, cost 3.
- Main competitor: apify/screenshot-url, 1,993 users, 3.88 (20 reviews), free (users pay compute), last updated
  2026-01-29. cheapapi/website-screenshot-api has 315 users, 5.0 (1 review), $0.00089 per screenshot;
  moonweil/url-screenshot-api 143 users, no reviews, $0.004 + $0.001 start; i-scraper 60 users, $0.006.
- Access: the user's URLs. Local test: one Chromium, 5 sites, 0.5 to 4.5 s each (2.2 s average). Pages behind bot
  protection fail and are not charged. Estimated cost about $0.0002 per screenshot at 1 GB.
- Suggested price: $0.0015 per screenshot (cheaper than everyone except cheapapi, with more options).
  Expected users: 25 to 40 per month.

### 19. Image OCR Text Extractor
- What: text from images (URLs or key-value store files): full text, per-line text with confidence and bounding boxes,
  language selection (English, Spanish, Portuguese, French, German, Italian and more), optional PDF pages later via
  idea 13. Images with no text are reported and not charged. For receipts, screenshots, scanned forms and memes.
- Scores: demand 4, competition 4, access 5, legal 5, cost 3.
- Main competitor: steadydata/image-ocr-text, 191 users, no reviews, $0.003 per image + $0.0005 start.
  zenomastro/image-ocr-text-extractor has 129 users, no reviews, $0.005 per image; the Google Lens OCR Actors
  (getascraper 73, zen-studio 58 users) depend on Google pages and are not an option for us.
- Access: the user's images; OCR with `tesseract.js` (Apache-2.0), language data bundled in the image so nothing is
  downloaded at run time. Local test: 0.7 s per 1000x700 screenshot on one core, about 3 s at 1 GB, about
  $0.00025 per image.
- Suggested price: $0.002 per image. Expected users: 20 to 35 per month.

### 20. Bulk File Downloader
- What: download a list of file URLs (or URLs found in another Actor's dataset field) into the key-value store or a
  single ZIP, with file name templates, type and size filters, retries, and a dataset row per file (URL, final URL,
  status, content type, bytes, public link, SHA-256). Useful after our App Store, Favicon/Logo and PDF Actors.
- Scores: demand 4, competition 4, access 5, legal 4, cost 4.
- Main competitor: rationalistic_candle_ucn/bulk-file-downloader, 123 users, no reviews, $0.002 per file + $0.001 per
  10 MB, last updated 2026-09-10. chris_elder/bulk-file-downloader has 74 users ($0.002 + $0.0005 start);
  automa-flow/parallel-bulk-file-downloader 56 users ($0.002 per file + $0.002 per 10 MB stored).
- Access: plain downloads of the user's URLs (a 2.2 MB arXiv PDF returned 200). Legal note: the user is responsible
  for the files; we skip HTML pages and cap the file size and count per run.
- Suggested price: $0.001 per file + $0.0005 per 10 MB. Expected users: 15 to 25 per month.

## Proposed

_Niche Scout 2026-11-26. Numbered 23 to 27, after the 2026-11-23 batch (18 to 22). Competitor numbers are 30-day users
from the Apify Store API on 2026-11-26 (about 65 keyword searches plus the top 3,000 Actors by popularity). Ranked by
expected monthly users. Scores as below (5 is best): demand, weak competition, access, legal safety, cost per result.
Also checked and dropped: Pexels/Unsplash stock photos (pexels.com answers 403 to plain requests; Openverse and
Wikimedia Commons Actors have under 20 users), ForexFactory/Investing economic calendar (calendar page 403, the open
JSON export covers only the current week), App Store and Google Play reviews (reviewer names, leader charges
$0.0001 per review), keyword search volume (needs a paid Google Ads or DataForSEO source), tennis and betting odds
(SofaScore and bookmakers block and own the data), Google Sheets export (free official Actor, 880 users), and low
demand niches: Deezer, BoardGameGeek, Roblox, Nintendo eShop, WCAG-only audits, font detection, brand colors, sanctions
lists, tenders, grants, nonprofits, weather, lotteries (all under 30 users for the leader)._

### 23. Website Contact and Social Links Finder (company level)
- What: for a list of company domains, read the homepage plus the contact, about and imprint pages (same domain, at
  most about 5 pages) and return one row per website: company social profiles (LinkedIn company page, X, Facebook,
  Instagram, YouTube, TikTok, GitHub, Pinterest), contact page URL, role-based emails only (info@, sales@, support@,
  hello@ and similar), phone numbers and address from `tel:` links and schema.org `Organization`/`LocalBusiness`,
  company name and logo from JSON-LD. Addresses that look like a person's name (john.smith@) are dropped, so we do not
  sell personal data. Cross-sells with Tech Stack Detector, Website Popularity Rank and the Favicon/Logo Extractor.
- Scores: demand 5, competition 3, access 4, legal 3, cost 5.
- Main competitor: vdrmota/contact-info-scraper, 3,827 users, 4.23 (93 reviews), $0.002 per page plus extra events.
  automation-lab/website-contact-finder has 246 users, no reviews, $0.033 start fee plus $0.0009 per page;
  emastra/website-contact-scraper 80 users ($0.004 per site); betterdevsscrape 53 users ($0.001 per page).
- Access: plain GETs of the user's domains, same fetch code as the Tech Stack Detector. Sites behind bot protection
  are reported as failed and not charged (no bypassing).
- Legal note: legal score is 3 because this is lead-gen territory. Keeping only company-level data (role emails,
  company pages, switchboard phones) is what keeps it inside our "no personal data" rule; the README must say so.
- Suggested price: $0.002 per website (one flat price, no start fee). Expected users: 30 to 50 per month.

### 24. Bulk Lighthouse and Core Web Vitals Audit
- What: run Google Lighthouse (Apache-2.0) on a list of URLs, mobile or desktop: performance, accessibility, best
  practices and SEO scores, LCP, FCP, CLS, TBT, Speed Index, page weight, the top 5 failed audits with estimated
  savings, and an optional HTML report saved to the key-value store. Optional user-supplied Google API key adds the
  real-user CrUX field data from PageSpeed Insights. Pairs with our SEO On-Page Audit.
- Scores: demand 4, competition 4, access 5, legal 5, cost 2.
- Main competitor: josh99smith/pagespeed-insights-audit, 134 users, no reviews, $0.004 per audit (uses Google's
  PageSpeed API). constant_quadruped/lighthouse-auditor 67 users, free; neverempty/pagespeed-lighthouse-audit 64 users,
  $0.015 per URL + $0.01 start; nerolabs 47 users ($0.005); seemuapps 34 users ($0.008). None has a review.
- Access: local test with Lighthouse 12 and the bundled Chromium: example.com 11 s, developer.mozilla.org 13 s,
  bbc.com 67 s (heavy page). The keyless PageSpeed API returns 429, so we run Lighthouse ourselves. Estimated cost
  $0.0015 to $0.005 per audit at 1 to 2 GB; cap the run time per URL at 90 s and do not charge timeouts.
- Suggested price: $0.006 per audit. Expected users: 20 to 35 per month.

### 25. Dataset Merge, Dedupe and Transform
- What: combine one or more Apify datasets, CSV, JSON/JSONL or XLSX files from URLs into one clean dataset: dedupe by
  any field or field combination (URL and domain normalising), keep only rows that are new since the last run
  (state in a named key-value store), filter by simple conditions, pick, rename and flatten fields, sort, and export to
  CSV/XLSX in the key-value store. Glue for every other pampa-data Actor and for Make/n8n users.
- Scores: demand 4, competition 2, access 5, legal 5, cost 5.
- Main competitor: lukaskrivka/dedup-datasets, 241 users, made by an Apify employee and close to free (users pay
  compute). humble-echidna/dataset-transform has 101 users, no reviews, $0.001 per row; nerolabs 62 users ($0.002 per
  kept row); saliga 58 users ($0.0005 per row); tidydata 52 users ($0.00025 per row). Only the free one is strong.
- Access: Apify API and the user's own files, no third-party site.
- Suggested price: $0.0001 per output row (cheapest paid option; the "only new rows" mode is the hook against the free
  one). Expected users: 10 to 20 per month.

### 26. Fuel Prices from Official Open Data (Spain, France, Austria)
- What: current fuel prices per station from government open data in one schema: station brand, address, city,
  postcode, coordinates, opening hours, fuel type, price, currency, last update. Filters by country, region/postcode,
  radius around a point, fuel type and brand; cheapest-N mode. More countries later (Italy MIMIT CSV, Argentina
  Secretaría de Energía) once their endpoints answer from the cloud.
- Scores: demand 3, competition 3, access 5, legal 5, cost 5.
- Main competitor: johnvc/fuelprices, 55 users, 5.0 (6 reviews), $0.001 per result. The GasBuddy Actors (US) are
  small: maximedupre 11 users ($0.00135), clearpath 7, silentflow 6, memo23 5.
- Access: Spain's MITECO REST service returned 200 (12 MB JSON, all stations, 17 s), France's
  data.economie.gouv.fr `prix-des-carburants-en-france-flux-instantane-v2` returned 200, Austria's E-Control
  `api.e-control.at/sprit` returned 200. Italy's CSV timed out and Argentina's datos.energia.gob.ar answered 503 today.
  Stations are businesses, so no personal data; Spain and France publish under open reuse licences with attribution
  (Builder to confirm Austria's API terms).
- Suggested price: $0.0005 per station row. Expected users: 8 to 15 per month.

### 27. SEC Form D Startup Funding Tracker
- What: new US private funding rounds from SEC Form D filings: company name, state, industry group, total offering
  amount, amount sold, number of investors, minimum investment, first sale date, filing date, amendment flag, and the
  EDGAR link. Filters by date range, state, industry and amount; daily "new since last run" mode. Related persons
  (executives' names and addresses) are left out on purpose.
- Scores: demand 2, competition 5, access 4, legal 4, cost 5.
- Main competitor: datahyena/company-funding-rounds, 35 users, 4.59 (4 reviews), $0.07 per round + $0.03 per monitor
  event. nexgendata/startup-funding-tracker has 19 users ($0.08 per record); pink_comic/sec-form-d-startup-funding-leads
  10 users ($0.002); logiover/sec-edgar-form-d-scraper 7 users, 1.0 rating ($0.0035).
- Access: EDGAR is public domain, but plain requests without a declared User-Agent get 403 (both `efts.sec.gov` and
  `www.sec.gov/Archives`). SEC's fair-access policy asks for a User-Agent with a company name and contact email and at
  most 10 requests per second; that is their documented rule, not bot blocking. The Builder needs a contact email for
  pampa-data from Damián before building.
- Suggested price: $0.002 per filing. Expected users: 8 to 15 per month.

_Niche Scout 2026-11-23. Numbered 18 to 22, after the 2026-11-19 batch (13 to 17). Ideas 18 to 20 were approved on 2026-11-25 and moved to **Approved**. Competitor numbers are 30-day users
from the Apify Store API on 2026-11-23 (about 45 searches plus the top 1,700 Actors by popularity). Ranked by expected
monthly users. Scores as below (5 is best): demand, weak competition, access, legal safety, cost per result. Like the
last batch, these are "tool" Actors that work on URLs or files the user gives us, so no platform's terms can shut them
down. Also checked and dropped: dataset merge and dedupe (a free Actor has 529 users), audio/video converter and audio
transcription (CPU cost per minute too high for our price), trademark registries (applicants include private people),
VIN decoder, product recalls, security headers, robots.txt and redirect checkers, link previews, PubMed, OpenAlex,
WooCommerce and recipe scrapers (all under 20 users for the leader)._

### 21. HTTP Request Runner (bulk API caller)
- What: send many HTTP requests from a list or a template with variables (method, headers, JSON or form body, auth
  header from a secret input), with concurrency and rate limits, retries and backoff, and one dataset row per request
  (status, timing, response headers, parsed JSON or text). Lets Make, n8n and Zapier users call any API in bulk from
  Apify. Hard limits on concurrency per host so it cannot be used to flood a site.
- Scores: demand 3, competition 4, access 5, legal 5, cost 5.
- Main competitor: memo23/http-request, 114 users, 5.0 (1 review), $0.005 per request. riceman/send-http-requests has
  63 users, 5.0 (2 reviews), $0.005 per request, last updated 2026-03-17; saliga/bulk-http-requests 11 users, $0.001.
- Access: no third-party site; requests go where the user points them (httpbin test returned 200).
- Suggested price: $0.0005 per request. Expected users: 10 to 20 per month.

### 22. Article Text Extractor
- What: for article URLs (or a news site's section page or RSS feed, linking with idea 9), the clean article: title,
  author field, published date, lead image, language, main text as plain text, Markdown and HTML, word count and reading
  time, using Mozilla Readability (Apache-2.0) plus JSON-LD dates. Good for LLM/RAG pipelines and media monitoring.
- Scores: demand 3, competition 2, access 3, legal 3, cost 5.
- Main competitor: lukaskrivka/article-extractor-smart, 152 users, 4.83 (10 reviews), free (made by an Apify
  employee). tropical_prune/article-news-extractor has 24 users, 5.0 (4 reviews), $0.001 per article.
- Access: one plain GET per URL (bbc.com/news returned 200). Paywalled or blocked pages are reported and not charged.
  Legal note: the user decides which articles; we return text for their own analysis and the README says so.
- Suggested price: $0.0005 per article. Expected users: 8 to 15 per month.

_Niche Scout 2026-11-19. Numbered 13 to 17, after the 2026-11-16 batch (8 to 12). Ideas 13 to 15 were approved on 2026-11-22 and moved to **Approved**. Competitor numbers are 30-day users from the
Apify Store API on 2026-11-19; about 45 searches checked. Ranked by expected monthly users. Scores as below (5 is best):
demand, weak competition, access, legal safety, cost per result. This batch leans on "tool" Actors that work on files or
URLs the user gives us, so there is no third-party site whose terms can block them later (lesson from ideas 3 and 4)._

### 16. Broken Link Checker
- What: crawl a website (same domain, depth and page limits) or check a URL list, and report every link that fails:
  source page, link URL, anchor text, status code, redirect chain, internal or external. Option to only output
  broken links. Built on the same fetch code as idea 8 (SEO audit).
- Scores: demand 3, competition 3, access 4, legal 5, cost 5.
- Main competitor: khadinakbar/broken-link-checker, 48 users, no reviews, $0.001 per link checked.
  logiover/bulk-url-status-checker has 17 users ($0.0025/URL); parseforge/broken-link-checker 4 users, 2.75 rating.
- Access: plain HEAD/GET requests with polite per-host concurrency; respects robots.txt for the crawl.
- Suggested price: $0.0004 per link checked. Expected users: 10 to 20 per month.

### 17. Chrome Web Store Extensions Scraper
- What: extension details by URL/ID or by category from the public sitemap: name, developer, users, rating, rating
  count, version, last updated, size, languages, category, featured badge, permissions summary, website link. No
  reviews (reviewer names are personal data) and no search pages.
- Scores: demand 2, competition 3, access 5, legal 4, cost 5.
- Main competitor: calm_builder/chrome-web-store-scraper, 30 users, no reviews, $0.0012 per row + $0.003 per detail.
  vujeen/chrome-web-store-scraper has 27 users, free, not updated since 2026-06-13; tugelbay (5 users, $0.005).
- Access: a detail page returned 200 to a plain request with the user count in the HTML; the sitemap index is public.
  robots.txt disallows `/search` and `/detail/*/reviews`, so we use detail pages and the sitemap only.
- Suggested price: $0.0015 per extension. Expected users: 10 to 15 per month.

_Niche Scout 2026-11-16. Numbered 8 to 12 so they follow the 2026-11-12 batch (3 to 7, PR #7). Competitor numbers are 30-day
users from the Apify Store API on 2026-11-16; about 70 searches checked. Ranked by expected monthly users. Scores as below
(5 is best): demand, weak competition, access, legal safety, cost per result._

### 10. Shopify App Store Scraper
- What: app listings from apps.shopify.com by category or app URL (from the public sitemap): name, developer, rating,
  review count, pricing plans, free trial, categories, languages, "Built for Shopify" badge, launch date. No reviews
  text, so no personal data. For app developers doing market research and agencies.
- Scores: demand 2, competition 4, access 5, legal 4, cost 5.
- Main competitor: applora/shopify-appstore-scraper, 40 users, 4.07 (5 reviews), $0.005/result.
  jungle_synthesizer/shopify-app-store-scraper-2 has 2 users, 1.0 (1 review), $0.1 start + $0.002.
- Access: app and category pages returned 200 to plain requests with JSON-LD (ratingValue, ratingCount). robots.txt
  disallows search URLs (`*q=*`), so we use categories and the sitemap only, never search.
- Suggested price: $0.002 per app. Expected users: 10 to 20 per month.

### 11. Luma Events Scraper
- What: public events from lu.ma by city or calendar: name, start/end with timezone, venue and coordinates (when public),
  online/in person, ticket price range, sold out or waitlist, guest count, organizer calendar, URL. No attendee or
  guest lists and no host personal profiles.
- Scores: demand 3, competition 2, access 4, legal 3, cost 5.
- Main competitor: matyascimbulka/luma-event-scraper, 40 users, 5.0 (1 review), $0.00007/event (very cheap). Others
  are expensive: hypebridge (23 users, 1.0, $0.1 start + $0.006), aitorsm (14 users, $0.03), webdatalabs (12 users, $0.02).
- Access: `api.lu.ma/discover/get-paginated-events` (the endpoint the site uses) returned 200 with JSON to a plain
  request; robots.txt only disallows `/insights/`. Caveat: undocumented endpoint and we could not read Luma's terms
  (page is rendered by JavaScript), so the Builder must check them before building.
- Suggested price: $0.0008 per event. Expected users: 10 to 15 per month.

### 12. Prediction Markets Odds Scraper (Polymarket and Kalshi)
- What: markets and current odds from Polymarket's public Gamma API and Kalshi's public market-data API in one schema
  (question, category, outcomes, probabilities, volume, liquidity, close date, resolution status), with keyword and
  category filters and optional price history. Read only; no trading or wallet data.
- Scores: demand 2, competition 4, access 5, legal 4, cost 5.
- Main competitor: congism/polymarket-kalshi-arb-finder, 8 users, no reviews, $0.05 start + $0.002/row.
  fatihtahta/polymarket-scraper-ppe has 6 users, $0.00099/record; logiover (3 users, $0.0025). Small but growing niche.
- Access: `gamma-api.polymarket.com/markets` returned 200 to a plain request; both APIs are documented for public reads.
- Suggested price: $0.001 per market. Expected users: 8 to 15 per month.

_Niche Scout 2026-11-10. Scores are 1 to 5 (5 is best): demand, weak competition, access, legal safety, cost per result.
Competitor numbers are 30-day users from the Apify Store API on 2026-11-10. Ranked by expected monthly users._

### 1. Google News Scraper (RSS)
- What: news articles (title, publisher, date, link, source URL) by keyword, topic or country/language, from Google News RSS feeds.
- Scores: demand 5, competition 2, access 5, legal 3, cost 5.
- Main competitor: data_xplorer/google-news-scraper-fast, 562 users, 4.9 stars (5 reviews), $0.004/article. Also lhotanova/google-news-scraper (366 users, 4.59, $0.002 + $0.005 start).
- Access: `news.google.com/rss/search?q=...` returned 200 with about 100 items to a plain request. Caveat: news.google.com robots.txt disallows `/rss` for generic crawlers; we keep volume low, headlines and links only, no article bodies.
- Suggested price: $0.0015 per article. Expected users: 40 to 60 per month.

### 2. Shopify Store Products Scraper
- What: full product catalog of any Shopify store (title, variants, price, compare-at price, availability, images, tags) from the store's public `products.json`.
- Scores: demand 3, competition 2, access 5, legal 4, cost 5.
- Main competitor: autofacts/shopify, 127 users, 4.19 (7 reviews), $0.001/product. Also trovevault/shopify-products-scraper (111 users, 5.0 with 8 reviews, $0.001 + $0.001 start).
- Access: `/products.json` returned 200 on a test store to a plain request. No personal data.
- Suggested price: $0.0007 per product. Expected users: 15 to 25 per month.

_Niche Scout 2026-11-12. Competitor numbers are 30-day users from the Apify Store API on 2026-11-12. About 45 niches checked; ranked by expected
monthly users. Scores as above (5 is best)._

### 7. Sitemap URL Extractor
- What: find a website's sitemaps (robots.txt, `/sitemap.xml`, sitemap indexes, gzip) and output every URL with
  lastmod, changefreq, priority and image/news tags, with filters by URL pattern and date. Feeds our other Actors.
- Scores: demand 2, competition 4, access 5, legal 5, cost 5.
- Main competitor: apify/sitemap-extractor, 57 users, 3.24 (8 reviews), $0.0005/URL. boxbox10/sitemap-extractor has
  41 users, free, no reviews.
- Access: sitemaps are public files meant for crawlers; a plain request returned 200.
- Suggested price: $0.0002 per URL. Expected users: 10 to 15 per month.

## Built

| Actor | Folder | Built | Store |
| --- | --- | --- | --- |
| Google Trends Scraper | `actors/google-trends-scraper` | 2026-11-02 | https://apify.com/pampa-data/google-trends-scraper |
| Website Popularity Rank Checker | `actors/website-popularity-rank` | 2026-11-10 | https://apify.com/pampa-data/website-popularity-rank |
| Company Jobs Scraper | `actors/company-jobs-scraper` | 2026-11-11 | https://apify.com/pampa-data/company-jobs-scraper |
| Keyword Suggestions Scraper (Google, YouTube, Bing) | `actors/keyword-suggestions-scraper` | 2026-11-12 | https://apify.com/pampa-data/keyword-suggestions-scraper |
| Website Tech Stack Detector | `actors/website-tech-stack-detector` | 2026-11-19 | https://apify.com/pampa-data/website-tech-stack-detector |
| Apple App Store Scraper (iTunes Search API) | `actors/app-store-scraper` | 2026-11-20 | https://apify.com/pampa-data/app-store-scraper |
| SEO On-Page Audit and Meta Tag Checker | `actors/seo-on-page-audit` | 2026-11-23 | https://apify.com/pampa-data/seo-on-page-audit (private until published) |
| RSS Feed Reader and Atom Parser (with Feed Finder) | `actors/rss-feed-reader` | 2026-11-24 | https://apify.com/pampa-data/rss-feed-reader (private until published) |

## Rejected

| Idea | Why |
| --- | --- |
| Product Hunt, Kickstarter and Udemy scrapers | Good demand (Product Hunt leader 174 users, Udemy 129) but all three answer plain requests with a Cloudflare challenge (403); would need bypassing (2026-11-16). |
| Coursera courses scraper | coursera.org robots.txt disallows `/api/` (2026-11-16). |
| Bing search, Meetup, Vinted and Bluesky scrapers | Bing and Meetup terms forbid automated scraping, Vinted sits behind bot protection, Bluesky posts are personal data (2026-11-16). |
| Similarweb traffic scraper | data.similarweb.com returns 403 to automated requests; getting around it would break their terms (2026-11-10). |
| Wayback Machine snapshot scraper | web.archive.org resets connections from our cloud environment (2026-11-10). |
| Trustpilot and Google Play review scrapers | Reviews carry reviewer names (personal data) and leaders already charge $0.0001 to $0.0006 per review (2026-11-10). |
| YouTube transcript scraper | YouTube terms forbid automated access and it blocks datacenter IPs; would need bypassing (2026-11-10). |
| Mercado Libre listings scraper | Big demand (top Actor 437 users) but the API returns 403 without a token and listing pages redirect to an account-verification wall (2026-11-12). |
| Google Ads Transparency scraper | Big demand (1,652 users) but the RPC endpoints redirect plain requests to Google's "sorry" captcha page (2026-11-12). |
| Craigslist scraper | Plain requests work, but posts are by private people and Craigslist has sued scrapers (2026-11-12). |
| Google Patents scraper | patents.google.com robots.txt disallows the `/xhr` search endpoint; leader has only 55 users (2026-11-12). |
| Amazon autocomplete (part of Keyword Suggestions) | completion.amazon.com robots.txt disallows all paths and Amazon's Conditions of Use forbid robots and data extraction; the Actor ships with Google, YouTube and Bing only (2026-11-12). |
| Domain Availability and WHOIS Checker (RDAP) | RDAP answers plain requests, but Verisign's RDAP terms (.com/.net, most of the demand) forbid using the data to "enable high volume, automated, electronic processes" except as reasonably necessary to register domains. A paid bulk checker is exactly that (2026-11-13). |
| Y Combinator companies directory | ycombinator.com robots.txt disallows `/companies?*` (the filtered directory) and the leaders sell founder emails; leader memo23 has 68 users (2026-11-19). |
| Remote Jobs Aggregator (Himalayas, Remotive, Remote OK, Arbeitnow, Jobicy) | The APIs answer plain requests, but the terms of the main sources forbid passing their jobs to third parties: Himalayas API terms (section 113c) ban giving jobs to "other job boards, aggregators"; Remotive's API notice bans submitting jobs to third-party sites and its robots.txt disallows `/api/*`; Jobicy's terms forbid reselling or redistributing its content without written consent. Remote OK (about 100 recent jobs) and Arbeitnow (mostly German onsite jobs, website terms say non-commercial) alone are too thin for a paid Actor (2026-11-17). |
| Substack Newsletter Posts Scraper | The `/api/v1/archive` endpoint answers plain requests and robots.txt allows it, but Substack's Terms of Use (Acceptable Use Policy) forbid using Substack in a way that "crawls, scrapes, or spiders any page, data, or portion of Substack (through use of manual or automated means)" and copying or storing "any significant portion of the content". A paid post scraper is exactly that. Publications' public RSS feeds stay usable through idea 9 (RSS and Atom Feed Reader) (2026-11-18). |
