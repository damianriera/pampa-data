## RSS Feed Reader and Atom Parser (with Feed Finder)

Turn **any RSS, Atom or JSON feed into clean, structured data**. Paste feed URLs, or just website addresses, and get **one row per article, post or podcast episode** with its **title, link, publish date, author, categories, summary, image, full text and audio file**, newest first.

Don't know the feed URL? Give the website (`stackoverflow.blog`) and the Actor **finds the feed** from the page's `<link rel="alternate">` tags or the usual paths (`/feed`, `/rss.xml`, `/atom.xml`, `/index.xml`, `/feed.json`...).

It reads every common format in one schema: **RSS 2.0, RSS 1.0 (RDF), Atom and JSON Feed**, including WordPress, Blogger, Ghost, Hugo, Medium, Substack, news sites, YouTube-style media feeds and **podcast feeds** (iTunes tags). No browser and no proxy: one plain request per feed, so it is fast and cheap: **$0.50 per 1,000 items**.

Use it to:

- **monitor news, competitors and industry blogs** on a schedule and send new items to Google Sheets, Slack, email or a webhook,
- **feed AI agents and RAG pipelines** with fresh articles as plain text (`content: "text"`),
- **track keywords and brand mentions** across hundreds of feeds (`keywords` filter, matches listed per item),
- **collect podcast episodes** with audio URL, size and duration,
- **build a news aggregator or newsletter** from many sources with duplicates removed.

### What data you get

One row per item:

| Field | Example | Meaning |
| --- | --- | --- |
| `title` | `Engineering AI Discover` | Item title (HTML removed) |
| `link` | `https://netflixtechblog.com/engineering-ai-discover-...` | Article, post or episode page |
| `published`, `updated` | `2026-11-17T17:01:02.000Z` | Dates in ISO 8601 (UTC), from any feed date format |
| `author` | `Netflix Technology Blog` | Author name as published (e-mail addresses are removed) |
| `categories` | `["ai", "llm"]` | Categories and tags |
| `summary` | `The challenges and decisions behind...` | Description as plain text, cut at **Summary length** |
| `content` | full article | Only when **Full content** is `text` or `html` and the feed carries it |
| `image` | `https://cdn-images-1.medium.com/...gif` | Item image (media:thumbnail, media:content, iTunes image or first image in the text) |
| `enclosureUrl`, `enclosureType`, `enclosureLengthBytes` | `https://...mp3`, `audio/mpeg`, `23613527` | Podcast audio or attached file |
| `durationSeconds` | `1475` | Podcast episode length |
| `commentsUrl`, `guid` | | Comments page and the feed's own item id |
| `matchedKeywords` | `["llm"]` | Which of your keywords the item mentions |
| `feedTitle`, `feedLink`, `feedUrl`, `feedType`, `feedLanguage` | `Planet Money`, `rss` | The feed the item came from |
| `source` | `stackoverflow.blog` | The URL you entered |

The `FEEDS` record (key-value store, also in the Output tab) lists every feed read with its title, type (`rss`, `rss1`, `atom`, `json`), description, language, image, last update, newest item date, number of items in the feed and number saved. Handy to check which sources are still active.

### How to use it

1. Paste feed URLs or websites in **Feeds or websites** (up to 5,000 per run).
2. Optionally keep only recent items (**Only items published after**: `2026-11-01` or `24 hours`) and filter by **keywords**.
3. Run it and export to JSON, CSV or Excel, or call it from the API, Make, Zapier or n8n. **Schedule it** (for example every hour with `publishedAfter: "1 hour"`) to get only new items each time.

Example input:

```json
{
    "urls": [
        "https://xkcd.com/atom.xml",
        "stackoverflow.blog",
        "https://medium.com/feed/@netflixtechblog",
        "https://feeds.npr.org/510289/podcast.xml"
    ],
    "publishedAfter": "7 days",
    "keywords": ["ai", "python"],
    "maxItemsPerFeed": 50,
    "content": "text"
}
```

Example output item:

```json
{
    "title": "Ivory Tower Elites",
    "link": "https://xkcd.com/3328/",
    "published": "2026-11-23T00:00:00.000Z",
    "author": null,
    "categories": [],
    "summary": null,
    "image": "https://imgs.xkcd.com/comics/ivory_tower_elites.png",
    "feedTitle": "xkcd.com",
    "feedType": "atom",
    "source": "https://xkcd.com/atom.xml"
}
```

### Pricing

You pay per item saved: **$0.50 per 1,000 items** ($0.0005 per item), no start fee. Feeds that are blocked or unreachable, websites without a feed, invalid URLs, items removed by your filters and duplicates are **not charged**; failed sources are listed in the `FAILED` record. Set a maximum cost per run in Apify and the Actor stops cleanly when it is reached.

### How it works and limits

- One plain HTTP request per feed (up to 30 MB, so large podcast feeds with thousands of episodes work), redirects followed. A website costs one extra request to find its feed.
- Items come from the feed itself, so you get what the publisher puts in it: many news feeds have only a short summary, while WordPress, Medium and most blogs include the full article.
- Polite: at most 2 requests at the same time to one website. We do not try to get around a site's blocking: a feed that answers 403 or a captcha is reported as failed and not charged.
- Character sets are detected (UTF-8, ISO-8859-1, Windows-1252 and others), and gzip feeds are unpacked.
- Respect the publisher's terms when you reuse full articles. Titles, links and short summaries are what feeds are made for.

### FAQ

**Can I get only new items on each run?** Yes. Schedule the Actor and set **Only items published after** to the schedule interval (for example `1 hour` or `1 day`).

**Does it work with Medium, Substack and YouTube?** Yes, through their public feeds: `medium.com/feed/@user`, `name.substack.com/feed`, or just paste the page address and the feed is found.

**What if a website has several feeds?** You get the main one. Turn on **Read every feed a website declares** to also read category or language feeds (comment feeds are always skipped).

### Related Actors

- [Google Trends Scraper](https://apify.com/pampa-data/google-trends-scraper): see whether the topics in your feeds are rising.
- [Keyword Suggestions Scraper](https://apify.com/pampa-data/keyword-suggestions-scraper): Google, YouTube and Bing autocomplete ideas for the keywords you monitor.
- [SEO On-Page Audit and Meta Tag Checker](https://apify.com/pampa-data/seo-on-page-audit): audit the pages the feed items link to.
- [Website Tech Stack Detector](https://apify.com/pampa-data/website-tech-stack-detector): which CMS and tools the publishers use.
- [Company Jobs Scraper](https://apify.com/pampa-data/company-jobs-scraper): open jobs from company career boards, another way to watch competitors.
