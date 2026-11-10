# Actor backlog

The Builder routine takes the first item under **Approved** that has no open PR, builds it, and moves it to **Built**.
The Niche Scout routine adds scored ideas under **Proposed** every Monday. To approve one, move it under **Approved**
(edit this file on GitHub or tell Claude in the project chat).

Rules for every idea: public data only, no logins, no personal data, no bypassing a site's bot blocking or terms.

## Approved

_(empty: waiting for the next Niche Scout shortlist)_

## Proposed

_Niche Scout 2026-11-10. Scores are 1 to 5 (5 is best): demand, weak competition, access, legal safety, cost per result.
Competitor numbers are 30-day users from the Apify Store API on 2026-11-10. Ranked by expected monthly users._

### 1. Google News Scraper (RSS)
- What: news articles (title, publisher, date, link, source URL) by keyword, topic or country/language, from Google News RSS feeds.
- Scores: demand 5, competition 2, access 5, legal 3, cost 5.
- Main competitor: data_xplorer/google-news-scraper-fast, 562 users, 4.9 stars (5 reviews), $0.004/article. Also lhotanova/google-news-scraper (366 users, 4.59, $0.002 + $0.005 start).
- Access: `news.google.com/rss/search?q=...` returned 200 with about 100 items to a plain request. Caveat: news.google.com robots.txt disallows `/rss` for generic crawlers; we keep volume low, headlines and links only, no article bodies.
- Suggested price: $0.0015 per article. Expected users: 40 to 60 per month.

### 2. Company Jobs Scraper (Greenhouse, Lever, Ashby, Workday)
- What: all open jobs of given companies from their public career boards, normalized into one schema (title, location, remote, department, salary when published, posted date, apply URL).
- Scores: demand 4, competition 3, access 5, legal 5, cost 5.
- Main competitor: fantastic-jobs/workday-jobs-api (181 users, 5.0 with 1 review, $0.002/job) and factpipe/ats-jobs-feed (135 users, no reviews, $0.005/job). Most single-ATS Actors have 0 to 1 reviews.
- Access: official public job-board APIs, all 200 to plain requests (`boards-api.greenhouse.io`, `api.lever.co/v0/postings`, `api.ashbyhq.com/posting-api`, Workday `/wday/cxs/.../jobs`). No recruiter names in output.
- Suggested price: $0.001 per job. Expected users: 30 to 50 per month.

### 3. Keyword Suggestions Scraper (Google, YouTube, Amazon, Bing)
- What: autocomplete suggestions for seed keywords from four sources in one run, with optional a to z and question expansion. Cross-sells with our Google Trends Scraper.
- Scores: demand 4, competition 3, access 5, legal 3, cost 5.
- Main competitor: automation-lab/google-autocomplete-scraper, 251 users, 4.85 (3 reviews), $0.001/keyword + $0.005 start. Amazon-only leader has 50 users; no well-rated multi-source Actor.
- Access: public suggest endpoints (`suggestqueries.google.com`, `ds=yt` for YouTube, `completion.amazon.com`, `api.bing.com/osjson.aspx`) all 200 to plain requests. Caveat: unofficial endpoints, same risk level as Google Trends.
- Suggested price: $0.0005 per suggestion. Expected users: 25 to 40 per month.

### 4. Shopify Store Products Scraper
- What: full product catalog of any Shopify store (title, variants, price, compare-at price, availability, images, tags) from the store's public `products.json`.
- Scores: demand 3, competition 2, access 5, legal 4, cost 5.
- Main competitor: autofacts/shopify, 127 users, 4.19 (7 reviews), $0.001/product. Also trovevault/shopify-products-scraper (111 users, 5.0 with 8 reviews, $0.001 + $0.001 start).
- Access: `/products.json` returned 200 on a test store to a plain request. No personal data.
- Suggested price: $0.0007 per product. Expected users: 15 to 25 per month.

### 5. Domain Availability and WHOIS Checker (RDAP)
- What: bulk check whether domains are registered, plus registrar, creation and expiry dates, status and nameservers, from official RDAP servers. Cross-sells with our Website Popularity Rank Checker.
- Scores: demand 3, competition 4, access 5, legal 5, cost 5.
- Main competitor: bridgeworks/domain-checker, 49 users, 1.0 (1 review), free. automation-lab/domain-availability-checker has 48 users, no reviews, $0.0023/domain + $0.035 start.
- Access: RDAP (official IANA bootstrap, `rdap.verisign.com` etc.) returned 200 for a registered and 404 for a free domain. Registrant contacts are not output.
- Suggested price: $0.001 per domain. Expected users: 10 to 20 per month.

## Built

| Actor | Folder | Built | Store |
| --- | --- | --- | --- |
| Google Trends Scraper | `actors/google-trends-scraper` | 2026-11-02 | https://apify.com/pampa-data/google-trends-scraper |
| Website Popularity Rank Checker | `actors/website-popularity-rank` | 2026-11-10 | https://apify.com/pampa-data/website-popularity-rank |

## Rejected

| Idea | Why |
| --- | --- |
| Similarweb traffic scraper | data.similarweb.com returns 403 to automated requests; getting around it would break their terms (2026-11-10). |
| Wayback Machine snapshot scraper | web.archive.org resets connections from our cloud environment (2026-11-10). |
| Trustpilot and Google Play review scrapers | Reviews carry reviewer names (personal data) and leaders already charge $0.0001 to $0.0006 per review (2026-11-10). |
| YouTube transcript scraper | YouTube terms forbid automated access and it blocks datacenter IPs; would need bypassing (2026-11-10). |
