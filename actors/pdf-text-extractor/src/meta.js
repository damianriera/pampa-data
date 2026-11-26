// PDF metadata helpers.

/** "D:20240306081813-05'00'" -> "2024-03-06T13:18:13.000Z". Returns null when it is not a PDF date. */
export function parsePdfDate(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    if (typeof value !== 'string') return null;
    if (/^\d{4}-\d{2}/.test(value.trim())) {
        const d = new Date(value.trim());
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    const m = /^(?:D:)?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?\s*(?:([Zz+-])\s*(\d{2})?'?(\d{2})?'?)?/.exec(value.trim());
    if (!m) {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) || !/\d{4}/.test(value) ? null : d.toISOString();
    }
    const [, y, mo = '01', d = '01', h = '00', mi = '00', s = '00', sign, oh = '00', om = '00'] = m;
    let ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
    if (sign === '+' || sign === '-') {
        const offset = (+oh * 60 + +om) * 60000;
        ms += sign === '+' ? -offset : offset;
    }
    const date = new Date(ms);
    if (Number.isNaN(date.getTime()) || +mo > 12 || +d > 31 || +y < 1900) return null;
    return date.toISOString();
}

/** Trimmed string or null; PDF info values are sometimes objects or blank. */
export function str(value) {
    if (typeof value !== 'string') return null;
    // Some writers pad with NUL or use a lone byte-order mark.
    const s = value.replace(/[\u0000﻿]/g, '').trim();
    return s || null;
}

/** Keywords field -> list ("a; b, c"). */
export function keywordList(value) {
    const s = str(value);
    if (!s) return [];
    return [...new Set(s.split(/[;,]/).map((k) => k.trim()).filter(Boolean))];
}
