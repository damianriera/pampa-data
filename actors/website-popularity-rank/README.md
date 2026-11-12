## Website Popularity Rank Checker

Check how popular any website is, for thousands of domains in one run. For each domain you get its rank in the **Tranco top 1 million** list, how that rank moved over the last month, and (optionally) a quick look at its homepage.

Use it to size competitors, qualify leads, clean prospect lists, spot rising sites, or add a popularity column to any domain list, without paying for a Similarweb or Semrush seat.

### What data you get

| Field | Example | Meaning |
| --- | --- | --- |
| `domain` | `mercadolibre.com.ar` | Registrable domain that was looked up |
| `rank` | `968` | Position in the latest Tranco top 1M (1 = most popular), `null` if not in the list |
| `tier` | `Top 1K` | Top 100 / 1K / 10K / 100K / 1M, or Not in top 1M |
| `trend` | `stable` | `rising`, `falling` or `stable` over the last 7 days |
| `change7d`, `change30d` | `-12` | Places gained (positive = moved up, negative = dropped) |
| `bestRank`, `worstRank`, `averageRank` | `940` | Over the history window |
| `history` | `[{"date":"2026-11-09","rank":968}, ...]` | Daily rank for about the last month |
| `site` | `{ "statusCode": 200, "title": "...", "language": "es" }` | Homepage status, final URL, HTTPS, server, response time, title, description, language (optional) |
| `listDate`, `listId` | `2026-11-09`, `947N2` | Which Tranco list the rank comes from, so results are reproducible |

### Where the ranks come from

[Tranco](https://tranco-list.eu) is a research-grade ranking of the top 1 million sites, published daily by researchers at KU Leuven and others. It combines Chrome UX Report, Cloudflare Radar, Cisco Umbrella, Majestic and Farsight data, and is hard to manipulate because it averages over 30 days. Tranco ranks sites by popularity, not by exact visit counts, so this Actor does **not** invent traffic numbers.

If you publish results, please cite Tranco: Le Pochat et al., "Tranco: A Research-Oriented Top Sites Ranking Hardened Against Manipulation", NDSS 2019.

### How to use it

1. Paste your domains or URLs, one per line. `https://www.example.com/page` and `shop.example.com` both become `example.com`.
2. Keep **Include rank history and trend** on for trends, or turn it off for the fastest bulk lookup.
3. Turn on **Include homepage info** if you also want status, title and language.
4. Run it, then export to JSON, CSV or Excel, or call it from the API, Make, Zapier or n8n.

Example input:

```json
{
    "domains": ["github.com", "https://www.mercadolibre.com.ar", "bbc.co.uk"],
    "includeHistory": true,
    "includeSiteInfo": false
}
```

### Speed

The rank lookup for 10,000 domains takes well under a minute. History adds about one second per ranked domain (the history source allows about one request per second), so 1,000 ranked domains with history take around 18 minutes. Domains outside the top 1M need no history call.

### Pricing

You pay per domain in the results, including domains that are not in the top 1M (knowing that is part of the answer). Invalid values such as `not a domain` are skipped, listed in the `FAILED` record, and not charged. Set a maximum cost per run in Apify and the Actor stops cleanly when it is reached.

### Limits

- Only the top 1 million sites have a rank. Small or new sites show `Not in top 1M`.
- Ranks are per registrable domain, so subdomains share their parent's rank.
- Homepage info is a single request to the homepage; sites that block bots may show an error there, while the rank is still returned.

### Related Actors

- [Google Trends Scraper](https://apify.com/pampa-data/google-trends-scraper): search interest over time for keywords and brands.
- [Company Jobs Scraper](https://apify.com/pampa-data/company-jobs-scraper): open jobs of the companies behind the domains you check, from Greenhouse, Lever, Ashby and Workday.
