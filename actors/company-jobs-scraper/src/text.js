const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', bull: '•' };

export function decodeEntities(s) {
    return String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
        if (e[0] === '#') {
            const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : m;
        }
        return ENTITIES[e.toLowerCase()] ?? m;
    });
}

/** HTML to readable plain text: block tags become line breaks, list items get bullets. */
export function htmlToText(html) {
    if (!html) return '';
    const s = String(html)
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
        .replace(/<li[^>]*>/gi, '\n• ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|ul|ol|tr|section)>/gi, '\n')
        .replace(/<[^>]+>/g, '');
    return decodeEntities(s)
        .replace(/[ \t ]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\n+•/g, '\n•')
        .trim();
}

export function workplaceFromText(...texts) {
    const t = texts.filter(Boolean).join(' ').toLowerCase();
    if (/\bhybrid\b/.test(t)) return 'hybrid';
    if (/\bremote\b|work from home|\bwfh\b|anywhere/.test(t)) return 'remote';
    return null;
}

/** "remote" | "hybrid" | "onsite" | null from the many spellings ATSs use. */
export function normalizeWorkplace(value) {
    if (!value) return null;
    const v = String(value).toLowerCase().replace(/[\s_-]/g, '');
    if (v.includes('remote')) return 'remote';
    if (v.includes('hybrid')) return 'hybrid';
    if (v.includes('onsite') || v.includes('inoffice') || v.includes('office')) return 'onsite';
    return null;
}

export function uniq(values) {
    return [...new Set(values.map((v) => (typeof v === 'string' ? v.trim() : v)).filter(Boolean))];
}

export function toIso(value) {
    if (value === null || value === undefined || value === '') return null;
    const d = new Date(typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const CURRENCY_SYMBOLS = { $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR' };

/** "$63,000" + "$80,000 CAD" -> { min: 63000, max: 80000, currency: 'CAD' } */
export function parseMoneyRange(minText, maxText) {
    const num = (s) => {
        const m = String(s ?? '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([kK])?/);
        return m ? Number(m[1]) * (m[2] ? 1000 : 1) : null;
    };
    const all = `${minText ?? ''} ${maxText ?? ''}`;
    const code = all.match(/\b([A-Z]{3})\b/)?.[1];
    const symbol = all.match(/[$€£¥₹]/)?.[0];
    return { min: num(minText), max: num(maxText ?? minText), currency: code ?? CURRENCY_SYMBOLS[symbol] ?? null };
}
