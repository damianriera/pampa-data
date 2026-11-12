// Google and YouTube share the public suggest endpoint used by browsers' search boxes.
// client=firefox answers plain JSON: [query, [suggestion, ...], ...].

const BASE = 'https://suggestqueries.google.com/complete/search';

function buildUrl(query, { language, country }, ds) {
    const p = new URLSearchParams({ client: 'firefox', hl: language, ie: 'UTF-8', oe: 'UTF-8', q: query });
    if (country) p.set('gl', country);
    if (ds) p.set('ds', ds);
    return `${BASE}?${p}`;
}

export function parseGoogle(body) {
    if (!body) return [];
    const data = JSON.parse(body);
    if (!Array.isArray(data) || !Array.isArray(data[1])) throw new Error('Unexpected Google suggest response');
    return data[1].filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim());
}

export const google = { id: 'google', name: 'Google', buildUrl: (q, o) => buildUrl(q, o), parse: parseGoogle };
export const youtube = { id: 'youtube', name: 'YouTube', buildUrl: (q, o) => buildUrl(q, o, 'yt'), parse: parseGoogle };
