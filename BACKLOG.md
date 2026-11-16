# Actor backlog

The Builder routine takes the first item under **Approved** that has no open PR, builds it, and moves it to **Built**.
The Niche Scout routine adds scored ideas under **Proposed** every Monday. To approve one, move it under **Approved**
(edit this file on GitHub or tell Claude in the project chat).

Rules for every idea: public data only, no logins, no personal data, no bypassing a site's bot blocking or terms.

## Approved

_Approved by Damián on 2026-11-10, in build order._

### 1. Keyword Suggestions Scraper (Google, YouTube, Amazon, Bing)
- What: autocomplete suggestions for seed keywords from four sources in one run, with optional a to z and question expansion. Cross-sells with our Google Trends Scraper.
- Scores: demand 4, competition 3, access 5, legal 3, cost 5.
- Main competitor: automation-lab/google-autocomplete-scraper, 251 users, 4.85 (3 reviews), $0.001/keyword + $0.005 start. Amazon-only leader has 50 users; no well-rated multi-source Actor.
- Access: public suggest endpoints (`suggestqueries.google.com`, `ds=yt` for YouTube, `completion.amazon.com`, `api.bing.com/osjson.aspx`) all 200 to plain requests. Caveat: unofficial endpoints, same risk level as Google Trends.
- Suggested price: $0.0005 per suggestion. Expected users: 25 to 40 per month.

### 2. Domain Availability and WHOIS Checker (RDAP)
- What: bulk check whether domains are registered, plus registrar, creation and expiry dates, status and nameservers, from official RDAP servers. Cross-sells with our Website Popularity Rank Checker.
- Scores: demand 3, competition 4, access 5, legal 5, cost 5.
- Main competitor: bridgeworks/domain-checker, 49 users, 1.0 (1 review), free. automation-lab/domain-availability-checker has 48 users, no reviews, $0.0023/domain + $0.035 start.
- Access: RDAP (official IANA bootstrap, `rdap.verisign.com` etc.) returned 200 for a registered and 404 for a free domain. Registrant contacts are not output.
- Suggested price: $0.001 per domain. Expected users: 10 to 20 per month.

## Proposed

_Niche Scout 2026-11-16. Numbered 8 to 12 so they follow the 2026-11-12 batch (3 to 7, PR #7). Competitor numbers are 30-day
users from the Apify Store API on 2026-11-16; about 70 searches checked. Ranked by expected monthly users. Scores as below
(5 is best): demand, weak competition, access, legal safety, cost per result._

### 8. SEO On-Page Audit and Metadata Checker
- What: for a list of URLs (or a sitemap), one row per page with HTTP status, redirect chain, response time, title and
  meta description (with lengths), canonical, robots meta and X-Robots-Tag, hreflang, H1/H2, word count, Open Graph and
  Twitter tags, JSON-LD types, image alt coverage, internal/external link counts and a list of issues found. Cross-sells
  with our Website Popularity Rank Checker (and the Sitemap and Tech Stack ideas if built).
- Scores: demand 3, competition 4, access 4, legal 5, cost 4.
- Main competitor: smart-digital/complete-seo-audit-tool, 86 users, 5.0 (4 reviews), $0.04 per page (expensive).
  Also autofacts/metadata-scraper (31 users, 5.0 with 2 reviews, $0.005/page) and logiover/bulk-url-status-checker
  (20 users, no reviews, $0.0025/URL).
- Access: one plain GET per page, no browser. Pages that block plain requests are reported as failed and not charged.
- Suggested price: $0.002 per page. Expected users: 20 to 30 per month.

### 9. RSS and Atom Feed Reader (with feed discovery)
- What: give feed URLs or plain website URLs; finds the feed (`<link rel="alternate">`, common paths), parses RSS 1/2,
  Atom and JSON Feed, and outputs one row per item (title, link, date, author field, categories, summary, image,
  enclosure for podcasts) with date and keyword filters and dedup across feeds. Works for blogs, news sites, Medium and
  Substack feeds, podcasts and job boards; good for scheduled monitoring into Sheets or webhooks.
- Scores: demand 3, competition 4, access 5, legal 5, cost 5.
- Main competitor: santamaria-automations/rss-feed-reader, 56 users, no reviews, $0.002/item. automation-lab/rss-feed-reader
  has 37 users, no reviews, $0.00115/item + $0.035 per start. (moving_beacon-owner1/medium-scraper, 63 users at $0.01,
  shows extra demand for Medium, whose public `medium.com/feed/...` RSS returned 200.)
- Access: feeds are published for machine reading; plain requests returned 200.
- Suggested price: $0.0005 per item. Expected users: 15 to 25 per month.

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

### 3. Remote Jobs Aggregator (Himalayas, Remotive, Remote OK, Arbeitnow, Jobicy)
- What: remote job listings from five public job-board APIs in one run, filtered by keyword, category, seniority and
  location restriction, deduplicated, with salary and the original apply link. Cross-sells with our Company Jobs Scraper.
- Scores: demand 4, competition 3, access 5, legal 4, cost 5.
- Main competitor: inlifeprojects/himalayas-jobs-scraper, 199 users, no reviews, $0.001/job (Himalayas only).
  memo23/remote-jobs-aggregator 192 users, 5.0 (2 reviews), $0.002/job; hirebase/remote-jobs 185 users, $0.005/job.
- Access: all five official JSON APIs returned 200 to plain requests (Himalayas reports about 119k jobs). Their terms
  ask for attribution and a link back, which we give by keeping `source` and the original job URL in every item.
- Suggested price: $0.0008 per job. Expected users: 30 to 50 per month.

### 4. Substack Newsletter Posts Scraper
- What: post list and metadata (title, subtitle, date, URL, audience free/paid, reactions, comment count, word count)
  for any Substack publication or custom domain, plus optional full text of free posts. No comments or reader data.
- Scores: demand 4, competition 3, access 5, legal 4, cost 5.
- Main competitor: automation-lab/substack-scraper, 181 users, no reviews, $0.00115/post + $0.005 start.
  Also sourabhbgp/substack-scraper (52 users, $0.0003) and fatihtahta/substack-scraper (48 users, $0.0025).
- Access: the public `/api/v1/archive` endpoint returned 200 with JSON on a real publication; robots.txt allows it.
- Suggested price: $0.0008 per post. Expected users: 25 to 40 per month.

### 5. Website Tech Stack Detector
- What: bulk detect the technologies a website uses (CMS, ecommerce platform, analytics, frameworks, CDN, payment,
  chat widgets) from its homepage HTML, headers, cookies and scripts, with categories and versions when visible.
  Cross-sells with our Website Popularity Rank Checker.
- Scores: demand 3, competition 4, access 4, legal 4, cost 4.
- Main competitor: scrapemint/website-tech-stack-detector, 66 users, 5.0 (2 reviews), $0.01 per tech row (expensive).
  Others: motivational_nickel (40 users, $0.0015/site), magicfingers (39 users, free, 4.31), automation-lab (32 users,
  $0.0023/site + $0.035 start).
- Access: one plain GET per site. Fingerprints from the open webappanalyzer dataset (GPL-3.0, reachable on GitHub);
  credit it in the README. Sites that block plain requests are reported as failed and not charged.
- Suggested price: $0.0015 per website. Expected users: 20 to 30 per month.

### 6. App Store Search and App Details (iTunes API)
- What: search the Apple App Store by keyword, developer or app id in any country, returning app details (name,
  developer, price, rating, rating count, version, release dates, size, genres, screenshots, description). No reviews,
  so no personal data.
- Scores: demand 3, competition 4, access 5, legal 5, cost 5.
- Main competitor: automation-lab/apple-app-store-scraper, 108 users, 5.0 (1 review), $0.00345/app + $0.005 start.
  johnvc/apple-app-store-search has 20 users, 5.0 (4 reviews), $0.003/result + $0.005 setup.
- Access: Apple's official iTunes Search and Lookup APIs returned 200 to plain requests (documented limit about
  20 requests per minute, so we pace calls).
- Suggested price: $0.001 per app. Expected users: 15 to 25 per month.

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
