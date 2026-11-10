---
name: build-apify-actor
description: Build, test, deploy, price and publish a new pampa-data Apify Actor in this repo. Use when adding an Actor from BACKLOG.md or fixing one.
---

# Build an Apify Actor (pampa-data)

## Ground rules

- Public data only. No logins, no personal data, no bypassing bot blocking, captchas or a site's terms. If a source
  answers 403/captcha to plain requests, stop and record the idea under **Rejected** in `BACKLOG.md` with the reason.
- Prefer official or open APIs and plain HTTP over browsers. Target 256 MB memory and a platform cost under 10% of the price.
- Pick niches where the leader is weak (low rating, stale, expensive) or where nobody serves the need well.

## Layout

One folder per Actor: `actors/<name>/` with

- `package.json` (type module, Node 22, scripts `start`, `test` = `node --test test/*.test.js`, `test:live`)
- `src/main.js` (orchestration), `src/input.js` (validation with `InputError`), one module per data source
- `.actor/actor.json` (`defaultMemoryMbytes: 256`, `output` set), `input_schema.json`, `dataset_schema.json`
  (an `overview` table view), `output_schema.json` (required to publish on the Store), `Dockerfile`
  (copy from an existing Actor)
- `test/` with unit tests against saved real responses in `test/fixtures/`, plus one `live.test.js` gated by `LIVE=1`
- `README.md` written for Store SEO: what data you get (table), how to use, example input, pricing, limits, related
  pampa-data Actors. `CHANGELOG.md`.

CI discovers Actor folders automatically; no workflow edit is needed.

## Code rules

- Validate input up front; `Actor.fail('Invalid input: ...')` on `InputError`.
- One dataset item per thing the user asked for. Never push empty or error items that would be charged; put failures in
  the `FAILED` key-value record.
- Respect `eventChargeLimitReached` from `Actor.pushData` and stop cleanly.
- Retries with exponential backoff on 429/5xx; respect a source's documented rate limit.
- Lessons from Google Trends: crawlee `BasicCrawler.sendRequest` ignores the proxy and drops cookies; use `gotScraping`
  with `proxyConfiguration.newUrl(session.id)` and a tough-cookie jar per session when a proxy is truly needed.

## Test before the PR

`npm test`, `npm run test:live`, and a local end-to-end run:

```bash
mkdir -p storage/key_value_stores/default && echo '{...}' > storage/key_value_stores/default/INPUT.json && npm start
```

## Deploy, price, publish

The Apify token is in the environment as `APIFY_TOKEN` (older setups: `KEY`). Never print it or commit it.

1. `npx apify-cli@1 push --force` from the Actor folder (the Deploy workflow does this after merge to main).
2. Find the Actor id: `GET https://api.apify.com/v2/acts/pampa-data~<name>`.
3. Set pay-per-event pricing with `PUT /v2/acts/<id>`:
   `{"pricingInfos":[{"pricingModel":"PAY_PER_EVENT","pricingPerEvent":{"actorChargeEvents":{"apify-default-dataset-item":{"eventTitle":"Result","eventDescription":"...","eventPriceUsd":0.002,"isPrimaryEvent":true}}}}]}`
   Price changes on a public Actor take effect after Apify's notice period; set the price before publishing.
4. Set Store metadata in the same call: `title`, `description`, `seoTitle`, `seoDescription`, `categories`, and
   `isPublic: true` to publish. Add the pampa-data logo from the project files if the listing needs it.
5. Run it once on the platform with the prefill input and check the dataset and cost per result.
6. Move the idea to **Built** in `BACKLOG.md` and add it to the root README table.
