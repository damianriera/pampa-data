## Apple App Store Scraper: iOS App Details, Ratings, Search

**An Apple App Store scraper and App Store API alternative** for app market research and ASO. Pay $1 per 1,000 apps, with no login.

Get **App Store app data in bulk** for any country: search the App Store by keyword, look up apps by link, id or bundle id, or list every app of a developer. Each app comes out as one clean row with name, developer, price, **rating and rating count**, version, release and last update dates, size, genres, languages, icon, screenshots and description.

It uses **Apple's official iTunes Search and Lookup APIs**, so there is no login, no browser and no blocked pages, and results are cheap and fast.

Use it to:

- do **App Store keyword research and ASO**: which apps rank for a keyword, in which order, in each country,
- track competitors' **ratings, prices and update frequency** over time (schedule it daily or weekly),
- compare an app's price, rating and availability **across 50 countries** in one run,
- build lead lists of app developers in a niche, or feed an AI agent or spreadsheet with app data.

### What data you get

| Field | Example | Meaning |
| --- | --- | --- |
| `appId`, `bundleId` | `324684580`, `com.spotify.client` | Stable ids |
| `name`, `url` | `Spotify: Music and Podcasts` | App name and App Store link |
| `developer`, `developerId`, `developerUrl`, `sellerName` | `Spotify` | Developer as shown on the store |
| `price`, `currency`, `formattedPrice`, `isFree` | `0`, `USD`, `Free`, `true` | Price in the country's store |
| `rating`, `ratingCount` | `4.79`, `149063` | Average rating and number of ratings |
| `ratingCurrentVersion`, `ratingCountCurrentVersion` | `4.79`, `149063` | Same, for the current version |
| `version`, `releaseDate`, `currentVersionReleaseDate` | `2.15.14`, `2019-01-31T09:10:14Z` | First release and last update |
| `primaryGenre`, `genres` | `Productivity` | Store categories |
| `contentRating`, `advisories` | `4+` | Age rating |
| `fileSizeBytes`, `fileSizeMB`, `minimumOsVersion` | `303.3` | Download size and required OS |
| `languages`, `supportedDevicesCount`, `features` | `["EN","ES"]` | Supported languages and devices |
| `platform` | `ios` or `mac` | iPhone/iPad app or Mac app |
| `iconUrl`, `screenshotUrls`, `ipadScreenshotUrls` | `https://is1-ssl.mzstatic.com/...` | Images (optional) |
| `description`, `releaseNotes` | `Habit Tracker: A simple...` | Full text (optional) |
| `country` | `us` | Store country |
| `source`, `searchTerm`, `position` | `search`, `habit tracker`, `1` | Where the row came from and its rank in the search |

User reviews and reviewer names are not collected.

### How to use it

1. Add **search terms** (like in the App Store search box), **apps** (links such as `https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580`, ids or bundle ids) and/or **developers** (developer page links or ids). You can mix all three in one run.
2. Pick the **countries** (two-letter codes like `us`, `gb`, `ar`, `de`, `jp`). Every input is fetched in each country.
3. Choose iPhone, iPad or Mac for searches and how many apps per search (up to 200).
4. Run it and export to JSON, CSV or Excel, or call it from the API, Make, Zapier or n8n.

Example input:

```json
{
    "searchTerms": ["habit tracker", "budget app"],
    "apps": ["https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580", "com.burbn.instagram"],
    "developers": ["https://apps.apple.com/us/developer/meta-platforms-inc/id284882218"],
    "countries": ["us", "gb", "ar"],
    "maxResultsPerSearch": 50
}
```

After the run, the `SUMMARY` record shows how many apps each search, developer and app batch returned per country, and `FAILED` lists apps not found in a country (for example, not sold there).

### Pricing

You pay per app row in the results: **$1 per 1,000 apps**. Apps that are not found and failed requests are not charged. Set a maximum cost per run in Apify and the Actor stops cleanly when it is reached.

### Speed

Apple allows about 20 API calls per minute and the Actor keeps to that. One call returns a whole search (up to 200 apps), a whole developer, or up to 100 apps by id, so 1,000 apps by id take about half a minute and 100 searches about 5 minutes.

### Limits

- Apple returns at most 200 apps per search and per developer. Search order matches the App Store's own search closely but not always exactly.
- Ratings are the store's averages and counts; review texts are not available from this API.
- Data comes from Apple's iTunes Search API; Apple's terms ask that icons and screenshots be used to promote the apps they show.

### FAQ

**Do I need an Apple account or API key?** No. The iTunes Search and Lookup APIs are public.

**Can I track rankings over time?** Yes: schedule the same searches daily and compare `position` by `searchTerm` and `country`.

**Does it work for Mac apps?** Yes: set the platform to Mac for searches, and Mac app links and ids work in **Apps**.

### Related Actors

- [Keyword Suggestions Scraper](https://apify.com/pampa-data/keyword-suggestions-scraper): find more keywords to search, from Google, YouTube and Bing autocomplete.
- [Google Trends Scraper](https://apify.com/pampa-data/google-trends-scraper): search interest for an app or category over time.
- [Website Popularity Rank Checker](https://apify.com/pampa-data/website-popularity-rank): popularity rank of the developers' websites.
- [Company Jobs Scraper](https://apify.com/pampa-data/company-jobs-scraper): who the app companies are hiring.
