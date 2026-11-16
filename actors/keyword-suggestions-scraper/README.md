## Keyword Suggestions Scraper (Google, YouTube, Bing Autocomplete)

Get **autocomplete keyword suggestions from Google, YouTube and Bing in one run**. Type in a few seed keywords and get every suggestion the search boxes show, for any **language and country**. Turn on **A to Z, question and preposition expansion** to grow one keyword into hundreds of real long-tail searches.

Autocomplete is what people actually type, ranked by how often they search it. It is the fastest free source of keyword ideas for:

- **SEO**: long-tail keywords, content clusters and FAQ ideas ("how to clean coffee maker"),
- **YouTube**: video titles and tags that match what viewers search on YouTube, not on Google,
- **PPC and ads**: new keywords and negative keywords,
- **market research**: what people associate with a brand, product or competitor ("notion vs", "notion alternative"),
- **AI agents and spreadsheets**: a clean keyword list ready for clustering.

No login, no browser, no API key. A run with 2 keywords, all three sources and every expansion returns about 2,000 unique keywords in a few seconds.

### What data you get

One item per unique suggestion, for each seed keyword and source:

| Field | Example | Meaning |
| --- | --- | --- |
| `keyword` | `coffee maker` | Your seed keyword |
| `source` | `google` | `google`, `youtube` or `bing` |
| `suggestion` | `coffee maker with grinder` | The autocomplete suggestion |
| `position` | `2` | Position in the suggestion list (1 is the top) |
| `query` | `coffee maker w` | What was typed to get it |
| `modifier` | `+w` | Expansion used (`+w` after, `how+` before, empty for the plain keyword) |
| `wordCount` | `4` | Words in the suggestion, handy to filter long-tail |
| `language`, `country` | `en`, `us` | Locale used |
| `scrapedAt` | `2026-11-12T12:45:24Z` | When it was collected |

Suggestions are de-duplicated per keyword and source, so you never pay twice for the same keyword from the same source. The same suggestion from Google and from YouTube appears twice on purpose: it tells you it is popular on both.

### How to use it

1. Add your seed keywords, one per line.
2. Pick sources (all three by default), a language (`en`, `es`, `pt-BR`, `de`...) and a country (`us`, `gb`, `ar`, `br`...).
3. Turn on expansions for more ideas:
   - **A to Z**: "coffee maker a", "coffee maker b"... (about 27 times more results),
   - **Questions**: "how coffee maker", "why coffee maker"... in the chosen language,
   - **Prepositions**: "coffee maker for", "coffee maker vs", "coffee maker without"...,
   - **Custom modifiers**: your own words, such as `price`, `review`, `best {keyword}` or `{keyword} alternative`.
4. Run it and export to CSV, Excel or JSON, or call it from the API, Make, Zapier or n8n.

Example input:

```json
{
    "keywords": ["coffee maker", "project management software"],
    "sources": ["google", "youtube", "bing"],
    "language": "en",
    "country": "us",
    "expandAlphabet": true,
    "expandQuestions": true,
    "customModifiers": ["best {keyword}", "{keyword} alternative"],
    "maxSuggestionsPerKeyword": 300
}
```

After the run, the `SUMMARY` record shows the queries sent and suggestions found per keyword and source, and `FAILED` lists anything that failed.

### Pricing

You pay per suggestion in the results. The seed keyword itself is skipped by default and duplicates are removed before saving, so you only pay for new keywords. Failed requests are never charged.

Rough sizes per seed keyword and source: plain keyword about 10 suggestions, with A to Z about 250, with every expansion about 300 to 400. Use **Max suggestions per keyword and source** or a maximum cost per run to cap spending; the Actor stops cleanly when the cap is reached.

### Limits

- Suggestions come from the public autocomplete endpoints of Google, YouTube and Bing. They show what is popular, not search volumes; pair them with [Google Trends Scraper](https://apify.com/pampa-data/google-trends-scraper) for interest over time.
- Each source returns up to about 10 suggestions per typed query; expansions are how you get more.
- Google may personalize or filter some suggestions (for example sensitive topics), and suggestions change over time.
- Amazon suggestions are not included: Amazon's terms do not allow automated collection.

### Related Actors

- [Google Trends Scraper](https://apify.com/pampa-data/google-trends-scraper): check which of your new keywords is growing, by region and over time.
- [Website Popularity Rank Checker](https://apify.com/pampa-data/website-popularity-rank): popularity rank of the websites that rank for your keywords.
- [Company Jobs Scraper](https://apify.com/pampa-data/company-jobs-scraper): open jobs of any company from Greenhouse, Lever, Ashby and Workday.
