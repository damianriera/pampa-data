/**
 * Input validation and normalization. Throws a readable error for bad input
 * so users see what to fix instead of a stack trace.
 */

export const TIME_RANGES = [
    'now 1-H', 'now 4-H', 'now 1-d', 'now 7-d',
    'today 1-m', 'today 3-m', 'today 12-m', 'today 5-y', 'all',
];

export const PROPERTIES = { web: '', images: 'images', news: 'news', youtube: 'youtube', shopping: 'froogle' };

export const REGION_RESOLUTIONS = ['AUTO', 'COUNTRY', 'REGION', 'CITY', 'DMA'];

export const MAX_TERMS_PER_COMPARISON = 5;

const CUSTOM_RANGE = /^(\d{4}-\d{2}-\d{2})(T\d{2})? (\d{4}-\d{2}-\d{2})(T\d{2})?$/;

export class InputError extends Error {}

function isValidDate(s) {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

/**
 * Splits an entry like "bitcoin, ethereum" into a comparison group.
 * Each entry in `searchTerms` becomes one group (one dataset item).
 */
export function toTermGroups(searchTerms) {
    if (!Array.isArray(searchTerms)) return [];
    const groups = [];
    for (const raw of searchTerms) {
        if (typeof raw !== 'string') continue;
        const terms = [...new Set(raw.split(',').map((t) => t.trim()).filter(Boolean))];
        if (!terms.length) continue;
        if (terms.length > MAX_TERMS_PER_COMPARISON) {
            throw new InputError(`"${raw}" compares ${terms.length} terms; Google Trends allows at most ${MAX_TERMS_PER_COMPARISON} per comparison.`);
        }
        groups.push(terms);
    }
    return groups;
}

export function normalizeInput(raw = {}) {
    const mode = raw.mode ?? 'explore';
    if (!['explore', 'trendingNow'].includes(mode)) {
        throw new InputError(`Unknown mode "${mode}". Use "explore" or "trendingNow".`);
    }

    const geo = String(raw.geo ?? '').trim().toUpperCase();
    if (geo && !/^[A-Z]{2}(-[A-Z0-9]{1,3}(-\d{1,4})?)?$/.test(geo)) {
        throw new InputError(`Invalid geo "${raw.geo}". Use a country code like "US", a region like "US-CA", or leave empty for worldwide.`);
    }

    let timeRange = raw.timeRange ?? 'today 12-m';
    const custom = String(raw.customTimeRange ?? '').trim();
    if (custom) {
        const m = CUSTOM_RANGE.exec(custom);
        if (!m || !isValidDate(m[1]) || !isValidDate(m[3])) {
            throw new InputError(`Invalid customTimeRange "${custom}". Use "YYYY-MM-DD YYYY-MM-DD", e.g. "2024-01-01 2024-06-30".`);
        }
        if (m[1] > m[3]) throw new InputError('customTimeRange start date must be before the end date.');
        if (m[1] < '2004-01-01') throw new InputError('Google Trends data starts on 2004-01-01.');
        timeRange = custom;
    } else if (!TIME_RANGES.includes(timeRange)) {
        throw new InputError(`Invalid timeRange "${timeRange}". Use one of: ${TIME_RANGES.join(', ')}.`);
    }

    const propertyKey = raw.searchProperty ?? 'web';
    if (!(propertyKey in PROPERTIES)) {
        throw new InputError(`Invalid searchProperty "${propertyKey}". Use one of: ${Object.keys(PROPERTIES).join(', ')}.`);
    }

    const category = Number(raw.category ?? 0);
    if (!Number.isInteger(category) || category < 0) throw new InputError('category must be a non-negative integer (0 = all categories).');

    const regionResolution = String(raw.regionResolution ?? 'AUTO').toUpperCase();
    if (!REGION_RESOLUTIONS.includes(regionResolution)) {
        throw new InputError(`Invalid regionResolution "${raw.regionResolution}". Use one of: ${REGION_RESOLUTIONS.join(', ')}.`);
    }

    const termGroups = mode === 'explore' ? toTermGroups(raw.searchTerms) : [];
    if (mode === 'explore' && !termGroups.length) {
        throw new InputError('Add at least one search term (e.g. "bitcoin", or "bitcoin, ethereum" to compare).');
    }

    const trendingGeos = [...new Set((raw.trendingGeos?.length ? raw.trendingGeos : [geo || 'US'])
        .map((g) => String(g).trim().toUpperCase()).filter(Boolean))];
    for (const g of trendingGeos) {
        if (!/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/.test(g)) throw new InputError(`Invalid trending geo "${g}". Use a country code like "US".`);
    }

    const timezoneOffset = Number(raw.timezoneOffset ?? 0);
    if (!Number.isInteger(timezoneOffset) || Math.abs(timezoneOffset) > 840) {
        throw new InputError('timezoneOffset must be minutes between -840 and 840 (e.g. 180 for UTC-3).');
    }

    return {
        mode,
        termGroups,
        geo,
        timeRange,
        category,
        property: PROPERTIES[propertyKey],
        searchProperty: propertyKey,
        regionResolution,
        includeLowVolumeRegions: Boolean(raw.includeLowVolumeRegions ?? false),
        includeInterestOverTime: raw.includeInterestOverTime ?? true,
        includeInterestByRegion: raw.includeInterestByRegion ?? true,
        includeRelatedQueries: raw.includeRelatedQueries ?? true,
        includeRelatedTopics: raw.includeRelatedTopics ?? false,
        language: String(raw.language ?? 'en-US'),
        timezoneOffset,
        trendingGeos,
        maxTrendingItems: Math.max(0, Number(raw.maxTrendingItems ?? 0) || 0),
        maxConcurrency: Math.min(10, Math.max(1, Number(raw.maxConcurrency ?? 3) || 3)),
        maxRetries: Math.min(20, Math.max(0, Number(raw.maxRetries ?? 8) || 0)),
        proxyConfiguration: raw.proxyConfiguration ?? { useApifyProxy: true },
    };
}
