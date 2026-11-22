// Loads and compiles the webappanalyzer fingerprints (GPL-3.0, https://github.com/enthec/webappanalyzer).
// Pattern syntax: "regex\;version:\1\;confidence:50". An empty regex means "the key is present".
import { readFileSync } from 'node:fs';

const DATA = new URL('../data/', import.meta.url);

export function parsePattern(value) {
    const parts = String(value ?? '').split('\\;');
    const pattern = { regex: null, version: null, confidence: 100 };
    const source = parts.shift();
    for (const part of parts) {
        const i = part.indexOf(':');
        if (i < 0) continue;
        const key = part.slice(0, i);
        const val = part.slice(i + 1);
        if (key === 'version') pattern.version = val;
        else if (key === 'confidence') pattern.confidence = Number(val) || 0;
    }
    if (source) {
        try {
            // Fingerprints are written for JavaScript regexes; a few cannot compile and are skipped.
            pattern.regex = new RegExp(source, 'i');
        } catch {
            return null;
        }
    }
    return pattern;
}

const toList = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const compileList = (v) => toList(v).map(parsePattern).filter(Boolean);
// Script URLs are matched one by one, but first against all of them joined by new lines (multiline flag)
// so a pattern that matches none of them is rejected with a single regex run.
const compileScriptList = (v) => compileList(v).map((p) => (p.regex ? { ...p, joined: new RegExp(p.regex.source, 'im') } : p));
const compileMap = (obj, lower = true) => Object.entries(obj ?? {}).map(([key, v]) => ({
    key: lower ? key.toLowerCase() : key,
    patterns: compileList(v === '' ? [''] : v),
}));

/**
 * Literal strings that must be present in the page for a CSS selector to match anything, one list per
 * comma-separated alternative: "n:x" is a tag name, attribute name, id or class; "v:x" is text inside an
 * attribute value. Lets the analyzer skip most DOM queries with a cheap lookup.
 * Returns null when no safe hint can be derived (the selector is then always queried).
 */
export function selectorHints(selector) {
    const alternatives = [];
    let depth = 0;
    let current = '';
    for (const ch of selector) {
        if (ch === '[' || ch === '(') depth++;
        if (ch === ']' || ch === ')') depth--;
        if (ch === ',' && depth === 0) { alternatives.push(current); current = ''; } else current += ch;
    }
    alternatives.push(current);
    const hints = [];
    for (const alt of alternatives) {
        if (/:not\(|:has\(|\\/.test(alt)) return null;
        const tokens = [];
        for (const m of alt.matchAll(/\[\s*([\w:-]+)\s*(?:[~|^$*]?=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\s*\]/g)) {
            tokens.push(`n:${m[1]}`);
            const value = m[2] ?? m[3] ?? m[4];
            if (value && !/[&<>]/.test(value)) tokens.push(`v:${value}`);
        }
        const outside = alt.replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ');
        for (const m of outside.matchAll(/[#.]([\w-]+)/g)) tokens.push(`n:${m[1]}`);
        const tags = outside.match(/(?:^|[\s>+~])([a-z][\w-]*)/gi) ?? [];
        for (const t of tags) {
            const tag = t.trim().replace(/^[>+~]/, '');
            if (tag.includes('-')) tokens.push(`n:${tag}`); // custom elements like <astro-island>
        }
        if (!tokens.length) return null;
        hints.push(tokens.map((x) => x.toLowerCase()));
    }
    return hints;
}

function compileDom(dom) {
    if (!dom) return [];
    if (typeof dom === 'string' || Array.isArray(dom)) {
        return toList(dom).filter((x) => typeof x === 'string').map((selector) => ({ selector, hints: selectorHints(selector), exists: true }));
    }
    return Object.entries(dom).map(([selector, rule]) => ({
        selector,
        hints: selectorHints(selector),
        exists: rule.exists !== undefined,
        text: rule.text !== undefined ? parsePattern(rule.text) : null,
        attributes: Object.entries(rule.attributes ?? {}).map(([name, p]) => ({ name, pattern: parsePattern(p) }))
            .filter((a) => a.pattern),
    }));
}

function splitNameAndConfidence(value) {
    const [name, ...rest] = String(value).split('\\;');
    const conf = rest.find((r) => r.startsWith('confidence:'));
    return { name, confidence: conf ? Number(conf.slice(11)) || 0 : 100 };
}

/** Builds the version string from a "\1" template (also "\1?yes:no"). */
export function resolveVersion(template, match) {
    if (!template || !match) return null;
    let v = template.replace(/\\(\d)\?([^:]*):(.*)$/, (_, n, yes, no) => (match[Number(n)] ? yes : no));
    v = v.replace(/\\(\d)/g, (_, n) => match[Number(n)] ?? '');
    v = v.trim();
    return v && v.length <= 40 ? v : null;
}

export function compileTechnologies(raw, categoryNames) {
    const techs = [];
    for (const [name, t] of Object.entries(raw)) {
        techs.push({
            name,
            cats: t.cats ?? [],
            categories: (t.cats ?? []).map((id) => categoryNames[id]).filter(Boolean),
            website: t.website ?? null,
            description: t.description ?? null,
            cpe: t.cpe ?? null,
            saas: t.saas ?? null,
            oss: t.oss ?? null,
            pricing: t.pricing ?? [],
            implies: toList(t.implies).map(splitNameAndConfidence),
            excludes: toList(t.excludes).map((e) => String(e).split('\\;')[0]),
            requires: toList(t.requires).map((e) => String(e).split('\\;')[0]),
            requiresCategory: toList(t.requiresCategory).map(Number),
            url: compileList(t.url),
            html: compileList(t.html),
            text: compileList(t.text),
            css: compileList(t.css),
            scriptSrc: compileScriptList(t.scriptSrc),
            meta: compileMap(t.meta),
            headers: compileMap(t.headers),
            cookies: compileMap(t.cookies, false),
            dns: compileMap(t.dns, false).map((d) => ({ ...d, key: d.key.toUpperCase() })),
            dom: compileDom(t.dom),
        });
    }
    return techs;
}

/** Adds our own patterns (data/extra.json) to the upstream fingerprints without replacing theirs. */
export function mergeExtra(raw, extra) {
    for (const [name, add] of Object.entries(extra)) {
        const tech = raw[name];
        if (!tech || name.startsWith('_')) continue;
        for (const [field, value] of Object.entries(add)) {
            const current = tech[field];
            if (Array.isArray(value)) tech[field] = [...toList(current), ...value];
            else if (typeof value === 'object') tech[field] = { ...(typeof current === 'object' && !Array.isArray(current) ? current : {}), ...value };
        }
    }
    return raw;
}

let cached;
export function loadFingerprints() {
    if (cached) return cached;
    const raw = mergeExtra(
        JSON.parse(readFileSync(new URL('technologies.json', DATA), 'utf8')),
        JSON.parse(readFileSync(new URL('extra.json', DATA), 'utf8')),
    );
    const { categories } = JSON.parse(readFileSync(new URL('categories.json', DATA), 'utf8'));
    const categoryNames = Object.fromEntries(Object.entries(categories).map(([id, c]) => [id, c.name]));
    const technologies = compileTechnologies(raw, categoryNames);
    cached = { technologies, byName: new Map(technologies.map((t) => [t.name, t])), categoryNames };
    return cached;
}
