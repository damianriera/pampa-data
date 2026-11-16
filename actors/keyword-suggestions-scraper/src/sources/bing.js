// Bing search box suggestions: {"AS":{"Results":[{"Suggests":[{"Txt":"..."}]}]}}.

const BASE = 'https://api.bing.com/qsonhs.aspx';

export function bingMarket(language, country) {
    return country ? `${language.split('-')[0]}-${country.toUpperCase()}` : language;
}

export function parseBing(body) {
    if (!body) return [];
    const data = JSON.parse(body);
    if (!data || typeof data !== 'object' || !data.AS) throw new Error('Unexpected Bing suggest response');
    const out = [];
    for (const group of data.AS.Results ?? []) {
        for (const s of group.Suggests ?? []) {
            if (typeof s.Txt === 'string' && s.Txt.trim()) out.push(s.Txt.trim());
        }
    }
    return out;
}

export const bing = {
    id: 'bing',
    name: 'Bing',
    buildUrl: (query, { language, country }) => `${BASE}?${new URLSearchParams({ q: query, mkt: bingMarket(language, country) })}`,
    parse: parseBing,
};
