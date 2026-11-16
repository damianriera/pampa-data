// Builds the list of queries sent to each source for one seed keyword.

const QUESTIONS = {
    en: ['how', 'what', 'why', 'where', 'when', 'who', 'which', 'can', 'is', 'are', 'does', 'will'],
    es: ['cómo', 'qué', 'por qué', 'dónde', 'cuándo', 'quién', 'cuál', 'cuánto', 'para qué', 'es'],
    pt: ['como', 'o que', 'por que', 'onde', 'quando', 'quem', 'qual', 'quanto', 'para que', 'é'],
    fr: ['comment', 'quoi', 'pourquoi', 'où', 'quand', 'qui', 'quel', 'combien', 'est-ce'],
    de: ['wie', 'was', 'warum', 'wo', 'wann', 'wer', 'welche', 'wieviel', 'ist', 'kann'],
    it: ['come', 'cosa', 'perché', 'dove', 'quando', 'chi', 'quale', 'quanto'],
};

const PREPOSITIONS = {
    en: ['for', 'with', 'without', 'vs', 'near', 'to', 'like', 'or', 'and'],
    es: ['para', 'con', 'sin', 'vs', 'cerca', 'o', 'y', 'de'],
    pt: ['para', 'com', 'sem', 'vs', 'perto', 'ou', 'e', 'de'],
    fr: ['pour', 'avec', 'sans', 'vs', 'près', 'ou', 'et', 'de'],
    de: ['für', 'mit', 'ohne', 'vs', 'in der nähe', 'oder', 'und'],
    it: ['per', 'con', 'senza', 'vs', 'vicino', 'o', 'e', 'di'],
};

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

const lang = (language) => {
    const base = language.split('-')[0].toLowerCase();
    return QUESTIONS[base] ? base : 'en';
};

/** Returns [{ query, modifier }] with the plain keyword first and no duplicate queries. */
export function buildQueries(keyword, { language = 'en', expandAlphabet = false, expandQuestions = false, expandPrepositions = false, customModifiers = [] } = {}) {
    const out = [{ query: keyword, modifier: null }];
    if (expandAlphabet) for (const c of ALPHABET) out.push({ query: `${keyword} ${c}`, modifier: `+${c}` });
    if (expandQuestions) for (const w of QUESTIONS[lang(language)]) out.push({ query: `${w} ${keyword}`, modifier: `${w}+` });
    if (expandPrepositions) for (const w of PREPOSITIONS[lang(language)]) out.push({ query: `${keyword} ${w}`, modifier: `+${w}` });
    for (const m of customModifiers) {
        if (m.includes('{keyword}')) out.push({ query: m.replaceAll('{keyword}', keyword), modifier: m });
        else out.push({ query: `${keyword} ${m}`, modifier: `+${m}` });
    }
    const seen = new Set();
    return out.filter(({ query }) => {
        const k = query.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}
