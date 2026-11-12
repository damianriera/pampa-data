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
| Similarweb traffic scraper | data.similarweb.com returns 403 to automated requests; getting around it would break their terms (2026-11-10). |
| Wayback Machine snapshot scraper | web.archive.org resets connections from our cloud environment (2026-11-10). |
| Trustpilot and Google Play review scrapers | Reviews carry reviewer names (personal data) and leaders already charge $0.0001 to $0.0006 per review (2026-11-10). |
| YouTube transcript scraper | YouTube terms forbid automated access and it blocks datacenter IPs; would need bypassing (2026-11-10). |
| Mercado Libre listings scraper | Big demand (top Actor 437 users) but the API returns 403 without a token and listing pages redirect to an account-verification wall (2026-11-12). |
| Google Ads Transparency scraper | Big demand (1,652 users) but the RPC endpoints redirect plain requests to Google's "sorry" captcha page (2026-11-12). |
| Craigslist scraper | Plain requests work, but posts are by private people and Craigslist has sued scrapers (2026-11-12). |
| Google Patents scraper | patents.google.com robots.txt disallows the `/xhr` search endpoint; leader has only 55 users (2026-11-12). |
