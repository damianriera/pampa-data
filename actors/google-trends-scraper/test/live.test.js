// Hits the real Google Trends site. Run with `npm run test:live`; skipped otherwise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gotScraping } from 'got-scraping';
import { CookieJar } from 'tough-cookie';

import { TrendsClient } from '../src/trends.js';

const live = process.env.LIVE === '1';

test('live: explore and trending now', { skip: !live, timeout: 120_000 }, async () => {
    const cookieJar = new CookieJar();
    const client = new TrendsClient({
        fetchText: async (url) => {
            const res = await gotScraping({ url, cookieJar, throwHttpErrors: false });
            return { statusCode: res.statusCode, body: res.body };
        },
    });
    await client.warmUp('US');
    const out = await client.scrapeGroup(['coffee', 'tea'], {
        geo: 'US', timeRange: 'today 3-m', category: 0, property: '',
        includeInterestOverTime: true, includeInterestByRegion: true,
        includeRelatedQueries: true, includeRelatedTopics: true, regionResolution: 'AUTO',
    });
    assert.ok(out.interestOverTime.timeline.length > 50);
    assert.ok(out.interestByRegion.regions.length > 10);
    assert.ok(out.relatedQueries.coffee.top.length > 0);
    const trending = await client.trendingNow('US');
    assert.ok(trending.length > 0);
});
