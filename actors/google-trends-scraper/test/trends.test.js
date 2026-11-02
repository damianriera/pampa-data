import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { BlockedError, TrendsClient, buildExploreUrl } from '../src/trends.js';

const fx = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

const OPTIONS = {
    geo: 'US', timeRange: 'today 3-m', category: 0, property: '',
    includeInterestOverTime: true, includeInterestByRegion: true,
    includeRelatedQueries: true, includeRelatedTopics: true, regionResolution: 'AUTO',
};

/** Serves fixtures by endpoint, like Google would for a "bitcoin, ethereum" comparison. */
function fixtureFetcher(calls) {
    return async (url) => {
        calls.push(url);
        const u = new URL(url);
        const p = u.pathname;
        if (p.endsWith('/api/explore')) return { statusCode: 200, body: fx('explore.txt') };
        if (p.endsWith('/multiline')) return { statusCode: 200, body: fx('TIMESERIES.txt') };
        if (p.endsWith('/comparedgeo')) return { statusCode: 200, body: fx('GEO_MAP.txt') };
        if (p.endsWith('/relatedsearches')) {
            const req = JSON.parse(u.searchParams.get('req'));
            const kw = req.restriction.complexKeywordsRestriction.keyword[0].value;
            return { statusCode: 200, body: fx(kw === 'bitcoin' ? 'RELATED_QUERIES_0.txt' : 'RELATED_QUERIES_1.txt') };
        }
        return { statusCode: 404, body: '' };
    };
}

test('scrapeGroup builds a full item for a comparison', async () => {
    const calls = [];
    const client = new TrendsClient({ fetchText: fixtureFetcher(calls) });
    const out = await client.scrapeGroup(['bitcoin', 'ethereum'], OPTIONS);
    assert.ok(out.interestOverTime.timeline.length > 0);
    assert.ok(out.interestByRegion.regions.length > 0);
    assert.ok(out.relatedQueries.bitcoin.top.length > 0);
    assert.ok(out.relatedQueries.ethereum.top.length > 0);
    assert.notDeepEqual(out.relatedQueries.bitcoin.top, out.relatedQueries.ethereum.top);
    // No RELATED_TOPICS widget in this comparison: empty lists, no extra request.
    assert.deepEqual(out.relatedTopics.bitcoin, { top: [], rising: [] });
    assert.equal(calls.length, 1 + 1 + 1 + 2);
    const exploreReq = JSON.parse(new URL(calls[0]).searchParams.get('req'));
    assert.deepEqual(exploreReq.comparisonItem.map((c) => c.keyword), ['bitcoin', 'ethereum']);
});

test('scrapeGroup skips disabled sections', async () => {
    const calls = [];
    const client = new TrendsClient({ fetchText: fixtureFetcher(calls) });
    const out = await client.scrapeGroup(['bitcoin', 'ethereum'], {
        ...OPTIONS, includeInterestByRegion: false, includeRelatedQueries: false, includeRelatedTopics: false,
    });
    assert.deepEqual(Object.keys(out), ['interestOverTime']);
    assert.equal(calls.length, 2);
});

test('scrapeGroup overrides the region resolution', async () => {
    const calls = [];
    const client = new TrendsClient({ fetchText: fixtureFetcher(calls) });
    const out = await client.scrapeGroup(['bitcoin', 'ethereum'], { ...OPTIONS, regionResolution: 'DMA', includeLowVolumeRegions: true });
    const geoCall = calls.find((c) => c.includes('/comparedgeo'));
    const req = JSON.parse(new URL(geoCall).searchParams.get('req'));
    assert.equal(req.resolution, 'DMA');
    assert.equal(req.includeLowSearchVolumeGeos, true);
    assert.equal(out.interestByRegion.resolution, 'DMA');
});

test('429 and HTML pages raise BlockedError so the session is rotated', async () => {
    const limited = new TrendsClient({ fetchText: async () => ({ statusCode: 429, body: '' }) });
    await assert.rejects(limited.scrapeGroup(['x'], OPTIONS), BlockedError);
    const captcha = new TrendsClient({ fetchText: async () => ({ statusCode: 200, body: '<html>unusual traffic</html>' }) });
    await assert.rejects(captcha.scrapeGroup(['x'], OPTIONS), BlockedError);
    const notFound = new TrendsClient({ fetchText: async () => ({ statusCode: 400, body: 'bad' }) });
    await assert.rejects(notFound.scrapeGroup(['x'], OPTIONS), (err) => !(err instanceof BlockedError));
});

test('trendingNow parses the RSS feed', async () => {
    const client = new TrendsClient({ fetchText: async () => ({ statusCode: 200, body: fx('trending_US.xml') }) });
    const items = await client.trendingNow('US');
    assert.equal(items.length, 10);
});

test('buildExploreUrl', () => {
    assert.equal(
        buildExploreUrl({ terms: ['yerba mate', 'coffee'], geo: 'AR', timeRange: 'today 12-m', category: 71, property: 'news' }),
        'https://trends.google.com/trends/explore?date=today%2012-m&q=yerba%20mate%2Ccoffee&geo=AR&cat=71&gprop=news',
    );
});
