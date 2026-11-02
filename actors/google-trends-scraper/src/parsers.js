/**
 * Pure parsing helpers for Google Trends responses. No network access here,
 * so everything in this file is unit-tested against saved fixtures.
 */

/**
 * Google prefixes its JSON responses with an anti-XSSI guard such as `)]}'`
 * or `)]}',`. Strip everything before the first `{` or `[` and parse.
 */
export function parseGoogleJson(text) {
    if (typeof text !== 'string') throw new TypeError('Expected a string response body');
    const start = text.search(/[{[]/);
    if (start === -1) throw new Error(`Response is not JSON: ${text.slice(0, 120)}`);
    return JSON.parse(text.slice(start));
}

/**
 * Splits the widgets returned by the `explore` endpoint by kind.
 * Comparisons (2+ terms) return one RELATED_QUERIES_<i> widget per term,
 * a single term returns plain RELATED_QUERIES.
 */
export function classifyWidgets(widgets, terms) {
    const out = { timeseries: null, geoMap: null, relatedQueries: {}, relatedTopics: {} };
    for (const widget of widgets ?? []) {
        const { id } = widget;
        if (id === 'TIMESERIES') out.timeseries = widget;
        else if (id === 'GEO_MAP') out.geoMap = widget;
        else {
            const match = /^(RELATED_QUERIES|RELATED_TOPICS)(?:_(\d+))?$/.exec(id);
            if (!match) continue;
            const term = terms[match[2] === undefined ? 0 : Number(match[2])];
            if (term === undefined) continue;
            const bucket = match[1] === 'RELATED_QUERIES' ? out.relatedQueries : out.relatedTopics;
            bucket[term] = widget;
        }
    }
    return out;
}

function toValuesByTerm(values, terms) {
    const obj = {};
    terms.forEach((term, i) => {
        obj[term] = Array.isArray(values) && typeof values[i] === 'number' ? values[i] : null;
    });
    return obj;
}

/** Parses the `widgetdata/multiline` response (interest over time). */
export function parseInterestOverTime(data, terms) {
    const timelineData = data?.default?.timelineData ?? [];
    const timeline = timelineData.map((point) => {
        const timestamp = Number(point.time);
        return {
            date: Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString() : null,
            timestamp: Number.isFinite(timestamp) ? timestamp : null,
            formattedTime: point.formattedTime ?? null,
            values: toValuesByTerm(point.value, terms),
            isPartial: Boolean(point.isPartial),
        };
    });

    const averages = {};
    terms.forEach((term, i) => {
        const fromGoogle = data?.default?.averages?.[i];
        if (typeof fromGoogle === 'number') {
            averages[term] = fromGoogle;
            return;
        }
        const nums = timeline.map((p) => p.values[term]).filter((v) => typeof v === 'number');
        averages[term] = nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : null;
    });

    return { averages, timeline };
}

/** Parses the `widgetdata/comparedgeo` response (interest by region). */
export function parseInterestByRegion(data, terms, resolution = null) {
    const rows = data?.default?.geoMapData ?? [];
    return {
        resolution,
        regions: rows
            .filter((row) => !Array.isArray(row.hasData) || row.hasData.some(Boolean))
            .map((row) => ({
                geoCode: row.geoCode ?? null,
                geoName: row.geoName ?? null,
                values: toValuesByTerm(row.value, terms),
                ...(row.coordinates ? { coordinates: row.coordinates } : {}),
            })),
    };
}

function absoluteTrendsLink(link) {
    if (!link) return null;
    return link.startsWith('http') ? link : `https://trends.google.com${link}`;
}

/** Parses the `widgetdata/relatedsearches` response for queries. */
export function parseRelatedQueries(data) {
    const lists = data?.default?.rankedList ?? [];
    const mapList = (list) => (list?.rankedKeyword ?? []).map((k) => ({
        query: k.query,
        value: k.value ?? null,
        formattedValue: k.formattedValue ?? null,
        isBreakout: k.formattedValue === 'Breakout',
        link: absoluteTrendsLink(k.link),
    }));
    return { top: mapList(lists[0]), rising: mapList(lists[1]) };
}

/** Parses the `widgetdata/relatedsearches` response for topics. */
export function parseRelatedTopics(data) {
    const lists = data?.default?.rankedList ?? [];
    const mapList = (list) => (list?.rankedKeyword ?? []).map((k) => ({
        title: k.topic?.title ?? null,
        type: k.topic?.type ?? null,
        mid: k.topic?.mid ?? null,
        value: k.value ?? null,
        formattedValue: k.formattedValue ?? null,
        isBreakout: k.formattedValue === 'Breakout',
        link: absoluteTrendsLink(k.link),
    }));
    return { top: mapList(lists[0]), rising: mapList(lists[1]) };
}

function decodeXml(s) {
    if (s == null) return null;
    return s
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&amp;/g, '&')
        .trim();
}

function tag(xml, name) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`);
    const m = re.exec(xml);
    if (!m) return null;
    const v = decodeXml(m[1]);
    return v === '' ? null : v;
}

function allBlocks(xml, name) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'g');
    return [...xml.matchAll(re)].map((m) => m[1]);
}

/** Parses an approximate traffic label such as "2K+" or "200+" into a number. */
export function parseApproxTraffic(label) {
    if (!label) return null;
    const m = /^([\d.,]+)\s*([KMB])?\+?$/i.exec(label.trim());
    if (!m) return null;
    const base = Number(m[1].replace(/,/g, ''));
    const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] ?? '').toUpperCase()] ?? 1;
    return Number.isFinite(base) ? Math.round(base * mult) : null;
}

/** Parses the Trending Now RSS feed (https://trends.google.com/trending/rss?geo=XX). */
export function parseTrendingRss(xml, geo) {
    return allBlocks(xml, 'item').map((item, index) => {
        const approxTraffic = tag(item, 'ht:approx_traffic');
        const pubDate = tag(item, 'pubDate');
        const parsedDate = pubDate ? new Date(pubDate) : null;
        return {
            rank: index + 1,
            geo,
            title: tag(item, 'title'),
            approxTraffic,
            approxTrafficNumber: parseApproxTraffic(approxTraffic),
            publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
            picture: tag(item, 'ht:picture'),
            pictureSource: tag(item, 'ht:picture_source'),
            newsItems: allBlocks(item, 'ht:news_item').map((n) => ({
                title: tag(n, 'ht:news_item_title'),
                snippet: tag(n, 'ht:news_item_snippet'),
                url: tag(n, 'ht:news_item_url'),
                picture: tag(n, 'ht:news_item_picture'),
                source: tag(n, 'ht:news_item_source'),
            })),
            exploreUrl: tag(item, 'title')
                ? `https://trends.google.com/trends/explore?q=${encodeURIComponent(tag(item, 'title'))}&geo=${encodeURIComponent(geo)}&date=now%201-d`
                : null,
        };
    });
}
