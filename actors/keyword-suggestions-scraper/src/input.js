import { SOURCE_IDS } from './sources/index.js';

export class InputError extends Error {}

export const MAX_KEYWORDS = 1000;

const strings = (raw, key) => {
    const v = raw[key];
    if (v == null) return [];
    if (!Array.isArray(v)) throw new InputError(`"${key}" must be a list.`);
    return v.filter((x) => typeof x === 'string').map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean);
};

export function normalizeInput(raw = {}) {
    const seen = new Set();
    const keywords = strings(raw, 'keywords').filter((k) => {
        const key = k.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    if (!keywords.length) throw new InputError('Add at least one seed keyword to "keywords".');
    if (keywords.length > MAX_KEYWORDS) throw new InputError(`At most ${MAX_KEYWORDS} keywords per run (got ${keywords.length}).`);
    const tooLong = keywords.find((k) => k.length > 200);
    if (tooLong) throw new InputError(`Keywords must be at most 200 characters ("${tooLong.slice(0, 40)}...").`);

    const sources = raw.sources == null ? [...SOURCE_IDS] : strings(raw, 'sources').map((s) => s.toLowerCase());
    if (!sources.length) throw new InputError(`Pick at least one source: ${SOURCE_IDS.join(', ')}.`);
    const unknown = sources.filter((s) => !SOURCE_IDS.includes(s));
    if (unknown.length) throw new InputError(`Unknown source(s): ${unknown.join(', ')}. Use ${SOURCE_IDS.join(', ')}.`);

    const language = String(raw.language ?? 'en').trim().toLowerCase() || 'en';
    if (!/^[a-z]{2,3}(-[a-z]{2,4})?$/.test(language)) throw new InputError('"language" must be a language code like en, es or pt-BR.');
    const country = String(raw.country ?? '').trim().toLowerCase();
    if (country && !/^[a-z]{2}$/.test(country)) throw new InputError('"country" must be a two-letter country code like us, ar or de, or empty.');

    const max = raw.maxSuggestionsPerKeyword ?? 0;
    if (!Number.isInteger(max) || max < 0 || max > 100000) throw new InputError('"maxSuggestionsPerKeyword" must be a whole number from 0 to 100000.');

    const customModifiers = strings(raw, 'customModifiers');
    if (customModifiers.length > 100) throw new InputError('At most 100 custom modifiers.');

    return {
        keywords,
        sources: [...new Set(sources)],
        language,
        country: country || null,
        expandAlphabet: Boolean(raw.expandAlphabet ?? false),
        expandQuestions: Boolean(raw.expandQuestions ?? false),
        expandPrepositions: Boolean(raw.expandPrepositions ?? false),
        customModifiers,
        includeSeedKeyword: Boolean(raw.includeSeedKeyword ?? false),
        maxSuggestionsPerKeyword: max || Infinity,
    };
}
