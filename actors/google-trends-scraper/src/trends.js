import {
    classifyWidgets,
    parseGoogleJson,
    parseInterestByRegion,
    parseInterestOverTime,
    parseRelatedQueries,
    parseRelatedTopics,
    parseTrendingRss,
} from './parsers.js';

export const BASE_URL = 'https://trends.google.com';

/** Thrown when Google throttles or blocks us; the caller should rotate the session and retry. */
export class BlockedError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

export function buildExploreUrl({ terms, geo, timeRange, category, property }) {
    const params = new URLSearchParams({ date: timeRange, q: terms.join(',') });
    if (geo) params.set('geo', geo);
    if (category) params.set('cat', String(category));
    if (property) params.set('gprop', property);
    return `${BASE_URL}/trends/explore?${params.toString().replace(/\+/g, '%20')}`;
}

/**
 * Talks to the internal Google Trends JSON endpoints.
 *
 * `fetchText(url)` must resolve to `{ statusCode, body }`. In production it
 * is Crawlee's `sendRequest` (session cookies + proxy); in tests a stub.
 */
export class TrendsClient {
    constructor({ fetchText, language = 'en-US', timezoneOffset = 0 }) {
        this.fetchText = fetchText;
        this.language = language;
        this.timezoneOffset = timezoneOffset;
    }

    async get(url) {
        const { statusCode, body } = await this.fetchText(url);
        if (statusCode === 429) throw new BlockedError('Google Trends rate limit (HTTP 429)', statusCode);
        if (statusCode >= 500 || statusCode === 403) throw new BlockedError(`Google Trends returned HTTP ${statusCode}`, statusCode);
        if (statusCode !== 200) throw new Error(`Google Trends returned HTTP ${statusCode} for ${url.split('?')[0]}: ${String(body).slice(0, 200)}`);
        return String(body ?? '');
    }

    /** Parses a JSON API body; an HTML page here means a captcha/consent wall, so we treat it as a block. */
    static parseJson(body) {
        if (/^\s*</.test(body)) throw new BlockedError('Google returned an HTML page (captcha or consent) instead of data', 200);
        return parseGoogleJson(body);
    }

    apiUrl(path, req, token) {
        const params = new URLSearchParams({ hl: this.language, tz: String(this.timezoneOffset), req: JSON.stringify(req) });
        if (token) params.set('token', token);
        return `${BASE_URL}/trends/api/${path}?${params.toString()}`;
    }

    /** Loads the Trends homepage once per session so Google sets the NID cookie. */
    async warmUp(geo = 'US') {
        await this.get(`${BASE_URL}/trends/?geo=${encodeURIComponent(geo || 'US')}&hl=${encodeURIComponent(this.language)}`);
    }

    async explore({ terms, geo, timeRange, category, property }) {
        const req = {
            comparisonItem: terms.map((keyword) => ({ keyword, geo, time: timeRange })),
            category,
            property,
        };
        const body = await this.get(this.apiUrl('explore', req));
        const json = TrendsClient.parseJson(body);
        if (!Array.isArray(json.widgets)) throw new Error('Unexpected explore response: no widgets');
        return json.widgets;
    }

    async widgetData(endpoint, widget) {
        const body = await this.get(this.apiUrl(`widgetdata/${endpoint}`, widget.request, widget.token));
        return TrendsClient.parseJson(body);
    }

    /**
     * Runs one comparison group end-to-end and returns a dataset item.
     * Sections whose widget is missing (e.g. too little search volume) are returned empty, not as errors.
     */
    async scrapeGroup(terms, options) {
        const widgets = classifyWidgets(await this.explore({ terms, ...options }), terms);
        const result = {};

        if (options.includeInterestOverTime) {
            result.interestOverTime = widgets.timeseries
                ? parseInterestOverTime(await this.widgetData('multiline', widgets.timeseries), terms)
                : { averages: Object.fromEntries(terms.map((t) => [t, null])), timeline: [] };
        }

        if (options.includeInterestByRegion) {
            if (widgets.geoMap) {
                const request = structuredClone(widgets.geoMap.request);
                if (options.regionResolution && options.regionResolution !== 'AUTO') request.resolution = options.regionResolution;
                if (options.includeLowVolumeRegions) request.includeLowSearchVolumeGeos = true;
                const data = await this.widgetData('comparedgeo', { request, token: widgets.geoMap.token });
                result.interestByRegion = parseInterestByRegion(data, terms, request.resolution ?? null);
            } else {
                result.interestByRegion = { resolution: null, regions: [] };
            }
        }

        if (options.includeRelatedQueries) {
            result.relatedQueries = {};
            for (const term of terms) {
                const widget = widgets.relatedQueries[term];
                result.relatedQueries[term] = widget
                    ? parseRelatedQueries(await this.widgetData('relatedsearches', widget))
                    : { top: [], rising: [] };
            }
        }

        if (options.includeRelatedTopics) {
            result.relatedTopics = {};
            for (const term of terms) {
                const widget = widgets.relatedTopics[term];
                result.relatedTopics[term] = widget
                    ? parseRelatedTopics(await this.widgetData('relatedsearches', widget))
                    : { top: [], rising: [] };
            }
        }

        return result;
    }

    async trendingNow(geo) {
        const body = await this.get(`${BASE_URL}/trending/rss?geo=${encodeURIComponent(geo)}`);
        if (!body.includes('<rss')) throw new BlockedError('Trending Now feed did not return RSS', 200);
        return parseTrendingRss(body, geo);
    }
}
