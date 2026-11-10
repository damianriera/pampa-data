# pampa-data

Data tools published on the [Apify Store](https://apify.com/pampa-data) under the `pampa-data` account.

| Actor | Folder | What it does |
| --- | --- | --- |
| Google Trends Scraper | [`actors/google-trends-scraper`](actors/google-trends-scraper) | Interest over time, by region, related queries/topics, and Trending Now. |
| Website Popularity Rank Checker | [`actors/website-popularity-rank`](actors/website-popularity-rank) | Tranco top 1M rank, rank history and trend, optional homepage info, for up to 10,000 domains. |

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

Merging to `main` runs the **Deploy** workflow (`.github/workflows/deploy.yml`): every Actor folder that changed is
pushed to Apify with `apify push` and built. It needs the repository secret `APIFY_TOKEN`; without it the job only logs
a notice. You can also run it by hand from the Actions tab, for one Actor or all of them.

`apify push` creates the Actor on Apify the first time. Pricing (pay-per-event, the built-in `apify-default-dataset-item`
event) and making the Actor public are one-time steps done through the Apify API or Console; see
[`.claude/skills/build-apify-actor/SKILL.md`](.claude/skills/build-apify-actor/SKILL.md).

## Pipeline

`BACKLOG.md` holds approved, proposed, built and rejected Actor ideas. Scheduled Claude sessions use it: Niche Scout
proposes ideas, Builder builds the approved ones, Daily Health watches runs, Pricing and Growth reviews prices and
listings, and Finance Pack prepares the monthly statement.
