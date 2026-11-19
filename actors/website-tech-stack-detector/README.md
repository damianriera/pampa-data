## Website Tech Stack Detector (Bulk Technology Lookup)

Find out **what any website is built with**, for thousands of sites at once. Paste a list of domains and get, for each one, its CMS, ecommerce platform, analytics and tag managers, advertising pixels, JavaScript frameworks, web server, CDN, hosting, payment providers, live chat, cookie banner and **e-mail provider**, with **versions** when the site shows them.

It checks more than **7,700 technology fingerprints** from the open-source [webappanalyzer](https://github.com/enthec/webappanalyzer) project (the community continuation of the original Wappalyzer fingerprints) against one plain request per site, plus the domain's DNS records. No browser, so it is fast and cheap: a few hundred sites a minute.

Use it to:

- **build lead lists**: find every Shopify, WooCommerce or Magento store in a list, or every company using HubSpot, Intercom or Salesforce,
- **qualify accounts** for sales: what analytics, CRM and e-mail tools a prospect already pays for,
- **research competitors** and markets: which CMS and frameworks win in a niche,
- **audit your own sites** and clients: outdated WordPress or jQuery versions, missing cookie consent, CDN coverage.

### What data you get

One row per website:

| Field | Example | Meaning |
| --- | --- | --- |
| `domain`, `finalUrl` | `www.allbirds.com` | Website after redirects |
| `technologyCount` | `15` | How many technologies the website itself shows |
| `technologyNames` | `Shopify, Cloudflare, PayPal, ...` | Those technologies as one text column (with versions) |
| `cms`, `ecommerce` | `["WordPress"]`, `["Shopify"]` | Content management and shop platform |
| `analytics`, `tagManagers`, `advertising` | `["Google Analytics"]` | Tracking and ad pixels |
| `marketingAutomation`, `liveChat`, `cookieCompliance` | `["HubSpot"]` | Marketing, CRM, chat and consent tools |
| `javascriptFrameworks`, `webFrameworks`, `programmingLanguages` | `["React"]`, `["PHP"]` | How the site is built |
| `webServers`, `cdn`, `hosting` | `["Nginx"]`, `["Cloudflare"]`, `["Vercel"]` | Where it runs |
| `paymentProcessors` | `["Stripe", "PayPal"]` | Payments and buy now pay later |
| `email` | `["Google Workspace"]` | E-mail provider, from MX and SPF records |
| `companyTools` | `["Salesforce", "Atlassian Cloud"]` | SaaS tools the company verified its domain with (DNS TXT records) |
| `technologies` | `[{ "name": "WordPress", "version": "6.9", "categories": ["CMS", "Blogs"], "confidence": 100, "detectedBy": ["meta", "html"] }]` | Full list with version, categories, confidence and what gave it away |
| `byCategory` | `{ "CMS": ["WordPress"] }` | Every technology grouped by its category (100+ categories) |
| `title`, `language`, `statusCode`, `responseTimeMs` | `Allbirds`, `en` | Homepage basics |

Turn on **Include technology details** to add each technology's website, description, SaaS or open source flag, pricing tier and CPE id (handy for security work).

### How to use it

1. Paste the websites, one per line: `example.com`, `www.example.com` or a full page URL like `https://example.com/shop`.
2. Keep **Check DNS records** on to also get the e-mail provider and the SaaS tools from DNS.
3. Run it and export to JSON, CSV or Excel, or call it from the API, Make, Zapier or n8n.

Example input:

```json
{
    "websites": ["wordpress.org", "allbirds.com", "nextjs.org", "https://www.example.com/pricing"],
    "includeDns": true,
    "includeDetails": false
}
```

Websites that cannot be read (offline, blocked, error pages) are listed in the `FAILED` record with the reason and are **not charged**.

### Pricing

You pay per website checked successfully: **$1.50 per 1,000 websites**. Failed and invalid websites are free. Set a maximum cost per run in Apify and the Actor stops cleanly when it is reached.

### How it works and limits

- One plain HTTP request per website (the page you give, or the homepage), up to 3 MB of HTML, plus a few DNS lookups. It reads response headers, cookies, HTML, script URLs, meta tags, inline CSS and page structure.
- No browser, so technologies that can only be seen by running the page's JavaScript, or that load only after a click or a cookie banner, can be missed. Single-page apps usually still show their framework.
- Speed: about 40 websites a minute with the default 1 GB memory. More memory (up to 4 GB) makes it faster at about the same cost per website.
- Some sites block automated requests (for example with a 403 page). In our tests about 1 in 7 big consumer brands did; small and mid-size business sites rarely do. They are reported as failed and not charged; we do not try to get around a site's blocking.
- Technologies found only through DNS (`companyTools`) belong to the company's domain, not necessarily to the page itself.
- Fingerprints: [webappanalyzer](https://github.com/enthec/webappanalyzer) by Enthec, GPL-3.0, plus a few of our own for popular frameworks. This Actor's source is GPL-3.0 as well.

### Related Actors

- [Website Popularity Rank Checker](https://apify.com/pampa-data/website-popularity-rank): Tranco top 1M rank and trend for the same domains, to sort your lead list by size.
- [Company Jobs Scraper](https://apify.com/pampa-data/company-jobs-scraper): open jobs of the companies you track, a strong buying signal next to their tech stack.
- [Keyword Suggestions Scraper](https://apify.com/pampa-data/keyword-suggestions-scraper): what people search about a product or platform, from Google, YouTube and Bing autocomplete.
