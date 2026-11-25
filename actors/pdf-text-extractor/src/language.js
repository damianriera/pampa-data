// A small stop-word language guess for the text, used when the PDF does not declare its language.

const STOP_WORDS = {
    en: 'the and of to in is that for it with as on was are be by this from or which at an not have has',
    es: 'de la que el en los del se las por un para con no una su al es lo como más pero sus le ya o este',
    pt: 'de que não em uma os no se na por mais as dos como mas foi ao ele das tem à seu sua ou ser quando',
    fr: 'de la le et les des en du un une est que pour qui dans par sur au pas plus ne se ce il sont avec',
    de: 'der die und in den von zu das mit sich des auf für ist im dem nicht ein eine als auch es an werden',
    it: 'di che il la e per un in non è una sono del della le si con da come al gli dei nel anche ma più',
    nl: 'de het een van en in is dat op te zijn met voor niet aan er ook als door maar bij om wordt dan nog',
};

const SETS = Object.fromEntries(Object.entries(STOP_WORDS).map(([lang, words]) => [lang, new Set(words.split(' '))]));

/** Returns an ISO 639-1 code (en, es, pt, fr, de, it, nl) or null when the text is too short or unclear. */
export function guessLanguage(text, sample = 20000) {
    const words = (text ?? '').slice(0, sample).toLowerCase().match(/\p{L}+/gu) ?? [];
    if (words.length < 20) return null;
    const scores = Object.fromEntries(Object.keys(SETS).map((l) => [l, 0]));
    for (const w of words) for (const l in SETS) if (SETS[l].has(w)) scores[l]++;
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [best, bestScore] = ranked[0];
    if (bestScore / words.length < 0.08 || bestScore < ranked[1][1] * 1.3) return null;
    return best;
}

/** "en-US" / "ES" / "English" -> "en"; anything else as given, lower case. */
export function normalizeLanguage(value) {
    if (!value || typeof value !== 'string') return null;
    const v = value.trim();
    if (!v) return null;
    const m = /^([a-z]{2,3})(?:[-_][a-z0-9]+)*$/i.exec(v);
    if (m) return m[1].toLowerCase();
    const names = { english: 'en', spanish: 'es', español: 'es', portuguese: 'pt', french: 'fr', german: 'de', italian: 'it', dutch: 'nl' };
    return names[v.toLowerCase()] ?? null;
}
