## Favicon & Logo Extractor: Bulk Website Logo Grabber

**Get the favicon and logo of any website, in bulk.** Pay $0.80 per 1,000 websites, with no subscription and no start fee.

Paste a list of domains and get, for each one, its **favicon**, its **largest high-resolution icon**, the **apple-touch-icon**, the **company logo** (from the site's structured data or its header, including inline **SVG** logos), the **og:image** social preview and the **brand theme color**. Every image is downloaded and checked, so you get its real file type and pixel size and no broken links. Turn on downloading to get the files themselves in the run's storage, with a link per file.

Use it to:

- **add logos to a CRM, lead list or directory** (HubSpot, Salesforce, Airtable, Notion, a company database),
- **show brand icons** next to links, bookmarks, integrations or search results in your app,
- **build a brand asset library** of competitors, customers or partners with their colors,
- **check your own sites**: missing favicons, broken icon links, low-resolution touch icons, no manifest.

### What data you get

One row per website:

| Field | Example | Meaning |
| --- | --- | --- |
| `domain`, `url`, `title`, `siteName` | `apify.com`, `Apify` | Website after redirects, page title and site name |
| `favicon`, `faviconType` | `https://apify.com/favicon.ico`, `ico` | The browser-tab icon (closest to 32 px) |
| `bestIcon`, `bestIconSize`, `bestIconType` | `.../apple-icon.png`, `180x180`, `png` | Largest square icon (an SVG icon when no raster icon is at least 64 px) |
| `svgIcon`, `appleTouchIcon` | `.../icon0.svg` | Scalable icon and iOS home screen icon, when the site has them |
| `logo`, `logoSource`, `logoType`, `logoWidth`, `logoHeight` | `.../apify-symbol.svg`, `json-ld`, `svg` | The company logo and where it was found: `json-ld` (schema.org Organization logo), `header-img`, `header-svg` (inline SVG as a data URI) or `icon` (no logo on the page, so the best icon) |
| `ogImage` | `.../og-image.png` | The social sharing image (og:image, else twitter:image) |
| `themeColor`, `backgroundColor`, `tileColor`, `maskIconColor` | `#020202` | Brand colors from meta tags and the web app manifest |
| `manifestUrl` | `.../site.webmanifest` | Web app manifest, whose icons are included |
| `icons` | `[{ "url": "...", "source": "icon", "type": "png", "width": 128, "height": 128, "bytes": 1808 }]` | Every working icon: rel=icon, apple-touch-icon, manifest, mask-icon, Windows tile and `/favicon.ico`, with real type and size (and all sizes inside a .ico) |
| `logos`, `socialImages` | same shape | Logo and social image candidates |
| `brokenImageLinks` | `0` | Icons the page declares that do not load |
| `bestIconDownloadUrl`, `logoDownloadUrl`, `downloads` | `https://api.apify.com/v2/key-value-stores/.../records/apify.com-icon.png` | With downloading on: links to the saved files |

### How to use it

1. Paste the websites, one per line: `example.com`, `www.example.com` or a full URL.
2. Choose **Download images** if you want the files, not only their links.
3. Run it and export to JSON, CSV or Excel, or call it from the API, Make, Zapier or n8n. The **Overview** table shows each icon and logo as a picture.

Example input:

```json
{
    "websites": ["apify.com", "stripe.com", "wordpress.org", "https://www.allbirds.com/"],
    "downloadImages": "best",
    "checkImages": true
}
```

Websites that cannot be read (offline, blocked, error pages) and websites with no icon or logo at all are listed in the `FAILED` record with the reason and are **not charged**.

### Pricing

You pay per website with at least one icon or logo found: **$0.80 per 1,000 websites** ($0.0008 each). Failed, blocked and empty websites are free. Downloading the files costs nothing extra beyond Apify storage. Set a maximum cost per run in Apify and the Actor stops cleanly when it is reached.

### How it works and limits

- One plain HTTP request for the homepage (up to 3 MB of HTML), one for the web app manifest when there is one, and one small request per icon or logo (at most 20 per site, 3 MB each). No browser, so it is fast and cheap: about 100 to 200 websites a minute with the default 256 MB memory.
- The logo is the schema.org `Organization` logo when the site publishes one; otherwise the image or inline SVG in the header that links to the homepage or is marked as a logo. Customer, partner and press logos in carousels and footers are skipped. Logos drawn only with CSS background images, or rendered by JavaScript after the page loads, can be missed; the best icon is returned instead.
- Inline SVG logos are returned as `data:image/svg+xml;base64,...` URIs, up to 30 KB. Some use the page's CSS colors (`currentColor`) and show black on their own.
- Some sites block automated requests (for example with a 403 page). In our tests about 1 in 4 big news and consumer brands did; small and mid-size business sites rarely do. They are reported as failed and not charged; we do not try to get around a site's blocking.
- Logos and icons are the trademarks of their owners. This Actor finds the public files a website itself publishes; how you use them is up to you.

### FAQ

**How do I get a website's logo in high resolution?** Use `logo` for the company logo (often an SVG, which scales to any size) and `bestIcon` for the largest square icon, usually 180 to 512 px from the apple-touch-icon or the web app manifest. The `icons` list has every size if you need a specific one.

**Is this a replacement for a favicon API like Google's s2/favicons or Clearbit Logo?** For bulk work, yes: you get the site's own files at full size with their real dimensions, plus the logo, colors and social image, instead of a fixed 16 to 64 px thumbnail. Run it once on your list and store the links or the files.

**Why is the logo just the icon for some sites?** The site publishes no schema.org logo and its header logo is drawn with CSS or JavaScript, so the Actor falls back to the best icon (`logoSource` is `icon`).

**Can I keep logos up to date?** Yes. Schedule the Actor monthly on your list and compare runs, or send the results to Google Sheets, Airtable or a webhook with Apify integrations, Make, Zapier or n8n.

### Related Actors

- [Website Tech Stack Detector](https://apify.com/pampa-data/website-tech-stack-detector): CMS, ecommerce platform, analytics, hosting and e-mail provider of the same websites.
- [Website Popularity Rank Checker](https://apify.com/pampa-data/website-popularity-rank): Tranco top 1M rank and trend for the same domains, to sort your list by size.
- [Image Converter and Resizer](https://apify.com/pampa-data/image-converter): turn the downloaded icons and logos into WebP, PNG or JPEG at the size you need.
- [SEO On-Page Audit and Meta Tag Checker](https://apify.com/pampa-data/seo-on-page-audit): titles, meta descriptions, Open Graph, structured data and issues for a list of pages.
