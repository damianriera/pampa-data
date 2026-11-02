import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
    classifyWidgets, parseApproxTraffic, parseGoogleJson, parseInterestByRegion,
    parseInterestOverTime, parseRelatedQueries, parseRelatedTopics, parseTrendingRss,
} from '../src/parsers.js';

const fx = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const TERMS = ['bitcoin', 'ethereum'];

test('parseGoogleJson strips the anti-XSSI prefix', () => {
    assert.deepEqual(parseGoogleJson(")]}',\n{\"a\":1}"), { a: 1 });
    assert.deepEqual(parseGoogleJson(")]}'\n{\"a\":2}"), { a: 2 });
    assert.throws(() => parseGoogleJson('<html>sorry</html>'), /not JSON/);
});

test('classifyWidgets maps per-term widgets in a comparison', () => {
    const { widgets } = parseGoogleJson(fx('explore.txt'));
    const w = classifyWidgets(widgets, TERMS);
    assert.equal(w.timeseries.id, 'TIMESERIES');
    assert.equal(w.geoMap.id, 'GEO_MAP');
    assert.equal(w.relatedQueries.bitcoin.id, 'RELATED_QUERIES_0');
    assert.equal(w.relatedQueries.ethereum.id, 'RELATED_QUERIES_1');
});

test('classifyWidgets handles a single term', () => {
    const { widgets } = parseGoogleJson(fx('explore_single.txt'));
    const w = classifyWidgets(widgets, ['yerba mate']);
    assert.equal(w.relatedQueries['yerba mate'].id, 'RELATED_QUERIES');
    assert.equal(w.relatedTopics['yerba mate'].id, 'RELATED_TOPICS');
});

test('parseInterestOverTime returns a timeline keyed by term', () => {
    const out = parseInterestOverTime(parseGoogleJson(fx('TIMESERIES.txt')), TERMS);
    assert.ok(out.timeline.length > 80);
    const first = out.timeline[0];
    assert.match(first.date, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(typeof first.values.bitcoin, 'number');
    assert.equal(typeof first.values.ethereum, 'number');
    assert.ok(out.averages.bitcoin > out.averages.ethereum);
});

test('parseInterestOverTime tolerates missing data', () => {
    const out = parseInterestOverTime({}, ['x']);
    assert.deepEqual(out, { averages: { x: null }, timeline: [] });
});

test('parseInterestByRegion returns regions with values per term', () => {
    const out = parseInterestByRegion(parseGoogleJson(fx('GEO_MAP.txt')), TERMS, 'REGION');
    assert.equal(out.resolution, 'REGION');
    assert.ok(out.regions.length >= 50);
    assert.match(out.regions[0].geoCode, /^US-/);
    assert.equal(typeof out.regions[0].values.bitcoin, 'number');
});

test('parseRelatedQueries returns top and rising lists with absolute links', () => {
    const out = parseRelatedQueries(parseGoogleJson(fx('RELATED_QUERIES_0.txt')));
    assert.ok(out.top.length > 0);
    assert.ok(out.rising.length > 0);
    assert.equal(out.top[0].value, 100);
    assert.match(out.top[0].link, /^https:\/\/trends\.google\.com\/trends\/explore/);
    assert.ok(out.rising.some((r) => r.isBreakout));
});

test('parseRelatedTopics maps topic fields', () => {
    const data = { default: { rankedList: [
        { rankedKeyword: [{ topic: { mid: '/m/05p0rrx', title: 'Bitcoin', type: 'Currency' }, value: 100, formattedValue: '100', link: '/trends/explore?q=/m/05p0rrx' }] },
        { rankedKeyword: [{ topic: { mid: '/g/x', title: 'Halving', type: 'Topic' }, value: 5000, formattedValue: 'Breakout', link: '/trends/explore?q=/g/x' }] },
    ] } };
    const out = parseRelatedTopics(data);
    assert.deepEqual(out.top[0], { title: 'Bitcoin', type: 'Currency', mid: '/m/05p0rrx', value: 100, formattedValue: '100', isBreakout: false, link: 'https://trends.google.com/trends/explore?q=/m/05p0rrx' });
    assert.equal(out.rising[0].isBreakout, true);
    assert.deepEqual(parseRelatedTopics(parseGoogleJson(fx('RELATED_TOPICS.txt'))), { top: [], rising: [] });
});

test('parseApproxTraffic', () => {
    assert.equal(parseApproxTraffic('200+'), 200);
    assert.equal(parseApproxTraffic('2K+'), 2000);
    assert.equal(parseApproxTraffic('1M+'), 1000000);
    assert.equal(parseApproxTraffic('10,000+'), 10000);
    assert.equal(parseApproxTraffic(null), null);
    assert.equal(parseApproxTraffic('lots'), null);
});

test('parseTrendingRss parses items and news', () => {
    const items = parseTrendingRss(fx('trending_US.xml'), 'US');
    assert.equal(items.length, 10);
    const [first] = items;
    assert.equal(first.rank, 1);
    assert.equal(first.geo, 'US');
    assert.ok(first.title);
    assert.ok(first.approxTrafficNumber > 0);
    assert.match(first.publishedAt, /^\d{4}-/);
    assert.ok(Array.isArray(first.newsItems) && first.newsItems.length > 0);
    assert.match(first.newsItems[0].url, /^https?:\/\//);
    assert.match(first.exploreUrl, /geo=US/);
});

test('parseTrendingRss decodes XML entities', () => {
    const xml = '<rss><channel><item><title>Tom &amp; Jerry &quot;live&quot;</title><ht:approx_traffic>1K+</ht:approx_traffic></item></channel></rss>';
    const [item] = parseTrendingRss(xml, 'GB');
    assert.equal(item.title, 'Tom & Jerry "live"');
    assert.equal(item.approxTrafficNumber, 1000);
    assert.deepEqual(item.newsItems, []);
});
