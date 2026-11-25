// Date and keyword filters, sorting and the dedup key for feed items.

const UNIT_MS = { minute: 60e3, hour: 3600e3, day: 86400e3, week: 7 * 86400e3, month: 30 * 86400e3 };

/** "2026-11-01", "2026-11-01T10:00:00Z", "7 days", "24 hours", "2 weeks" -> Date, or null when empty. Throws on junk. */
export function parseSince(value, now = new Date()) {
    if (value == null || String(value).trim() === '') return null;
    const s = String(value).trim().toLowerCase();
    const rel = /^(\d+)\s*(minute|hour|day|week|month)s?(\s+ago)?$/.exec(s);
    if (rel) return new Date(now.getTime() - Number(rel[1]) * UNIT_MS[rel[2]]);
    const t = Date.parse(value);
    if (Number.isNaN(t)) throw new Error(`"${value}" is not a date (use 2026-11-01 or "7 days")`);
    return new Date(t);
}

/** Lowercased, accent-free text for keyword matching. */
export function fold(s) {
    return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Which keywords appear in the item's title, summary, categories (and full text when present). */
export function matchKeywords(item, keywords) {
    if (!keywords.length) return [];
    const haystack = fold([item.title, item.summary, item.categories?.join(' '), item.contentText].filter(Boolean).join('\n'));
    return keywords.filter((k) => haystack.includes(fold(k)));
}

/** Cheap check that needs no text conversion. */
export function passesDateFilter(item, { since }) {
    if (!since) return true;
    const date = item.published ?? item.updated;
    return Boolean(date) && new Date(date) >= since;
}

/** Full check; call materialize(item) first so summary and contentText exist. */
export function passesFilters(item, { since, keywords, excludeKeywords }) {
    if (!passesDateFilter(item, { since })) return false;
    if (keywords.length && matchKeywords(item, keywords).length === 0) return false;
    if (excludeKeywords.length && matchKeywords(item, excludeKeywords).length > 0) return false;
    return true;
}

/** Newest first; items without a date keep their feed order after the dated ones. */
export function sortNewestFirst(items) {
    return items
        .map((item, i) => ({ item, i, t: item.published ? Date.parse(item.published) : null }))
        .sort((a, b) => (a.t == null && b.t == null ? a.i - b.i : a.t == null ? 1 : b.t == null ? -1 : b.t - a.t || a.i - b.i))
        .map((x) => x.item);
}

const TRACKING = /^(utm_\w+|fbclid|gclid|mc_cid|mc_eid|ref|source|rss|cmpid)$/i;

/** Same article in two feeds -> same key: link without tracking parameters, fragment, "www." or trailing slash. */
export function dedupKey(item) {
    if (item.link) {
        try {
            const u = new URL(item.link);
            for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
            u.hash = '';
            const host = u.hostname.replace(/^www\./, '');
            return `link:${host}${u.pathname.replace(/\/+$/, '')}${u.search}`;
        } catch { /* fall through */ }
    }
    if (item.guid) return `guid:${item.guid}`;
    return `title:${fold(item.title)}|${item.published ?? ''}`;
}
