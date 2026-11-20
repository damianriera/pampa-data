export class InputError extends Error {}

export const MAX_SEARCH_TERMS = 500;
export const MAX_APPS = 10000;
export const MAX_DEVELOPERS = 500;
export const MAX_COUNTRIES = 50;

export const PLATFORMS = {
    iphone: 'software',
    ipad: 'iPadSoftware',
    mac: 'macSoftware',
};

const strings = (raw, key) => {
    const v = raw[key];
    if (v == null) return [];
    if (!Array.isArray(v)) throw new InputError(`"${key}" must be a list.`);
    return v.filter((x) => typeof x === 'string' || typeof x === 'number').map((x) => String(x).trim().replace(/\s+/g, ' ')).filter(Boolean);
};

const unique = (list, key = (x) => x) => {
    const seen = new Set();
    return list.filter((x) => {
        const k = key(x);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
};

/**
 * An app reference: a numeric App Store id, an App Store URL (apps.apple.com/us/app/name/id284882215)
 * or a bundle id (com.spotify.client).
 */
export function parseAppRef(text) {
    const s = text.trim();
    const fromUrl = s.match(/apple\.com\/.*?\bid(\d{5,12})(?:\D|$)/i);
    if (fromUrl) return { type: 'id', value: fromUrl[1] };
    const bare = s.match(/^(?:id)?(\d{5,12})$/i);
    if (bare) return { type: 'id', value: bare[1] };
    if (/^[a-z0-9-]+(\.[a-z0-9_-]+)+$/i.test(s) && !/^https?:/i.test(s)) return { type: 'bundleId', value: s };
    throw new InputError(`"${text}" is not an App Store app URL, numeric app id or bundle id.`);
}

/** A developer reference: a numeric developer id or a developer page URL (apps.apple.com/us/developer/name/id284882218). */
export function parseDeveloperRef(text) {
    const s = text.trim();
    const fromUrl = s.match(/apple\.com\/.*?developer\/.*?\bid(\d{5,12})(?:\D|$)/i);
    if (fromUrl) return fromUrl[1];
    const bare = s.match(/^(?:id)?(\d{5,12})$/i);
    if (bare) return bare[1];
    throw new InputError(`"${text}" is not an App Store developer URL or numeric developer id.`);
}

export function normalizeInput(raw = {}) {
    const searchTerms = unique(strings(raw, 'searchTerms'), (t) => t.toLowerCase());
    const apps = unique(strings(raw, 'apps').map(parseAppRef), (a) => `${a.type}:${a.value.toLowerCase()}`);
    const developers = unique(strings(raw, 'developers').map(parseDeveloperRef));

    if (!searchTerms.length && !apps.length && !developers.length) {
        throw new InputError('Add at least one search term, app or developer.');
    }
    if (searchTerms.length > MAX_SEARCH_TERMS) throw new InputError(`At most ${MAX_SEARCH_TERMS} search terms per run (got ${searchTerms.length}).`);
    if (apps.length > MAX_APPS) throw new InputError(`At most ${MAX_APPS} apps per run (got ${apps.length}).`);
    if (developers.length > MAX_DEVELOPERS) throw new InputError(`At most ${MAX_DEVELOPERS} developers per run (got ${developers.length}).`);
    const longTerm = searchTerms.find((t) => t.length > 200);
    if (longTerm) throw new InputError(`Search terms must be at most 200 characters ("${longTerm.slice(0, 40)}...").`);

    const countriesRaw = raw.countries == null ? ['us'] : strings(raw, 'countries');
    const countries = unique(countriesRaw.map((c) => c.toLowerCase()));
    if (!countries.length) throw new InputError('Add at least one country, for example us.');
    if (countries.length > MAX_COUNTRIES) throw new InputError(`At most ${MAX_COUNTRIES} countries per run.`);
    const badCountry = countries.filter((c) => !/^[a-z]{2}$/.test(c));
    if (badCountry.length) throw new InputError(`Country codes must be two letters like us, gb, ar or de (got ${badCountry.join(', ')}).`);

    const platform = String(raw.platform ?? 'iphone').toLowerCase();
    if (!PLATFORMS[platform]) throw new InputError(`"platform" must be one of ${Object.keys(PLATFORMS).join(', ')}.`);

    const maxResults = raw.maxResultsPerSearch ?? 50;
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 200) {
        throw new InputError('"maxResultsPerSearch" must be a whole number from 1 to 200 (Apple returns at most 200 per search).');
    }

    const language = String(raw.language ?? '').trim().toLowerCase().replace('-', '_');
    if (language && !/^[a-z]{2}_[a-z]{2}$/.test(language)) throw new InputError('"language" must look like en_us, es_es or ja_jp, or be empty.');

    return {
        searchTerms,
        apps,
        developers,
        countries,
        platform,
        maxResultsPerSearch: maxResults,
        language: language || null,
        includeDescription: Boolean(raw.includeDescription ?? true),
        includeScreenshots: Boolean(raw.includeScreenshots ?? true),
    };
}
