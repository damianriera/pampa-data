# pampa-data

Data tools published on the [Apify Store](https://apify.com/pampa-data) under the `pampa-data` account.

| Actor | Folder | What it does |
| --- | --- | --- |
| Google Trends Scraper | [`actors/google-trends-scraper`](actors/google-trends-scraper) | Interest over time, by region, related queries/topics, and Trending Now. |

## Working on an Actor

```bash
cd actors/google-trends-scraper
npm install
npm test            # unit tests against saved Google responses
npm run test:live   # one real request to Google Trends
```

Run it locally with an input file:

```bash
mkdir -p storage/key_value_stores/default
echo '{"searchTerms":["coffee, tea"],"geo":"US","proxyConfiguration":{"useApifyProxy":false}}' \
  > storage/key_value_stores/default/INPUT.json
npm start
```

## Publishing

Each Actor builds on Apify straight from this repository: in Apify Console create the Actor from
Git repository `https://github.com/damianriera/pampa-data#main:actors/<actor-folder>`, or push it with
`apify push` from the Actor folder after `apify login`.

Pricing is pay-per-event, set in Apify Console under the Actor's **Monetization** tab. The only
event the code relies on is the built-in "result" event (`apify-default-dataset-item`), charged per
dataset item.
