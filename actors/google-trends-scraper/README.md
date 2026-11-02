# Google Trends Scraper

Get Google Trends data as clean, ready-to-use JSON, CSV or Excel. For any search term, or up to 5 terms compared on the same scale, you get:

- **Interest over time**: the 0-100 timeline Google shows on the chart, plus the average per term.
- **Interest by region**: countries, states/regions, cities or US metro areas.
- **Related queries**: top and rising queries, with "Breakout" flags.
- **Related topics** (optional): top and rising topics when Google provides them.

There is also a **Trending Now** mode that returns today's trending searches for any country, with approximate search volume and the news articles behind each trend.

## Why this scraper

- **One result per term or comparison.** Every section for a term comes in a single dataset item, so you pay for one result, not one per data point.
- **Built for Google's rate limits.** Each request uses its own proxy session and cookies. When Google answers with HTTP 429 or a captcha, the scraper drops that session, waits a little longer, and retries with a fresh IP (8 retries by default).
- **No silent junk.** Failed terms are never pushed as empty results you pay for. They are listed in the `FAILED` record of the run's key-value store, with the reason.
- **Clear input errors.** A wrong location code or date range stops the run right away with a message that says what to fix.

## How to use it

1. Add your search terms, one per line. To compare terms, put up to 5 on one line separated by commas: `bitcoin, ethereum`.
2. Pick a location (`US`, `AR`, `US-CA`, or empty for worldwide) and a time range.
3. Click **Start**. A typical term takes 2-3 seconds.

For Trending Now, choose **What to scrape → Trending Now** and list the countries, e.g. `US`, `GB`, `AR`.

### Input example

```json
{
    "searchTerms": ["yerba mate", "bitcoin, ethereum"],
    "geo": "US",
    "timeRange": "today 12-m",
    "searchProperty": "web",
    "includeInterestOverTime": true,
    "includeInterestByRegion": true,
    "includeRelatedQueries": true
}
```

| Field | What it does |
| --- | --- |
| `searchTerms` | One line per result. Comma-separate up to 5 terms to compare them. |
| `geo` | Country (`US`) or region (`US-CA`) code. Empty = worldwide. |
| `timeRange` | `now 1-H`, `now 4-H`, `now 1-d`, `now 7-d`, `today 1-m`, `today 3-m`, `today 12-m`, `today 5-y`, `all`. |
| `customTimeRange` | `YYYY-MM-DD YYYY-MM-DD`, overrides `timeRange`. |
| `searchProperty` | `web`, `images`, `news`, `youtube` or `shopping`. |
| `category` | Google Trends category ID (0 = all). |
| `regionResolution` | `AUTO`, `COUNTRY`, `REGION`, `CITY` or `DMA` (US metros). |
| `mode` | `explore` (default) or `trendingNow`. |
| `trendingGeos` | Countries for Trending Now. |
| `language`, `timezoneOffset` | Language of region names, and the timezone for dates (minutes behind UTC, e.g. 180 for Buenos Aires). |
| `proxyConfiguration` | Apify Proxy by default. Switch to the RESIDENTIAL group if you see many retries. |

### Output example (explore)

```json
{
    "type": "explore",
    "searchTerms": ["bitcoin", "ethereum"],
    "geo": "US",
    "timeRange": "today 3-m",
    "category": 0,
    "searchProperty": "web",
    "interestOverTime": {
        "averages": { "bitcoin": 31, "ethereum": 2 },
        "timeline": [
            {
                "date": "2026-08-02T00:00:00.000Z",
                "timestamp": 1785628800,
                "formattedTime": "Aug 2, 2026",
                "values": { "bitcoin": 51, "ethereum": 8 },
                "isPartial": false
            }
        ]
    },
    "interestByRegion": {
        "resolution": "REGION",
        "regions": [
            { "geoCode": "US-KS", "geoName": "Kansas", "values": { "bitcoin": 88, "ethereum": 12 } }
        ]
    },
    "relatedQueries": {
        "bitcoin": {
            "top": [{ "query": "bitcoin price", "value": 100, "formattedValue": "100", "isBreakout": false, "link": "https://trends.google.com/trends/explore?q=bitcoin+price&date=today+3-m&geo=US" }],
            "rising": [{ "query": "british man recovers lost bitcoin", "value": 13250, "formattedValue": "Breakout", "isBreakout": true, "link": "https://trends.google.com/trends/explore?q=british+man+recovers+lost+bitcoin&date=today+3-m&geo=US" }]
        }
    },
    "exploreUrl": "https://trends.google.com/trends/explore?date=today%203-m&q=bitcoin%2Cethereum&geo=US",
    "scrapedAt": "2026-11-02T03:58:12.000Z"
}
```

### Output example (Trending Now)

```json
{
    "type": "trendingNow",
    "rank": 1,
    "geo": "US",
    "title": "scottie barnes",
    "approxTraffic": "500+",
    "approxTrafficNumber": 500,
    "publishedAt": "2026-11-02T03:40:00.000Z",
    "picture": "https://encrypted-tbn0.gstatic.com/images?q=...",
    "pictureSource": "RotoWire",
    "newsItems": [{ "title": "...", "url": "https://www.rotowire.com/...", "source": "RotoWire" }],
    "exploreUrl": "https://trends.google.com/trends/explore?q=scottie%20barnes&geo=US&date=now%201-d",
    "scrapedAt": "2026-11-02T03:58:12.000Z"
}
```

## Pricing

You pay per result saved to the dataset: one result per search term or comparison line, and one per trending search. Failed terms are not charged. Set a maximum cost per run in the run options and the scraper stops cleanly when it is reached, keeping everything collected so far.

## Good to know

- **Values are relative.** Google scales every timeline so the highest point is 100. Values from different runs or comparison groups are not on the same scale; compare terms by putting them on the same line.
- **Low-volume terms** can return empty sections. That is Google having too little data, not an error.
- **Related topics** are often empty for automated requests at the moment, so they are off by default.
- **Trending Now** comes from Google's public RSS feed, which lists the top recent trends per country (usually 10-20).

## Use cases

- Find seasonal demand before launching products or ads.
- Track brand or competitor interest over time and by state.
- Discover rising keywords for SEO and content ideas.
- Feed daily trending topics into newsletters, dashboards or AI agents.

## Legal

This Actor collects aggregated, anonymous statistics that Google publishes on Google Trends. It does not collect personal data. Use the data in line with Google's terms and the laws that apply to you.

## Feedback

Found a bug or need a field? Open an issue on the Actor's Issues tab and it will be looked at quickly.
