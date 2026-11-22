// Matches page signals (HTML, headers, cookies, scripts, meta tags, DOM, DNS) against the fingerprints.
// Independent implementation; only the fingerprint data comes from webappanalyzer.
import { resolveVersion } from './fingerprints.js';

const MAX_HTML_FOR_REGEX = 1024 * 1024;

function testPattern(pattern, value) {
    if (value === undefined || value === null) return null;
    if (!pattern.regex) return { confidence: pattern.confidence, version: resolveVersion(pattern.version, ['']) };
    const m = pattern.regex.exec(String(value));
    if (!m) return null;
    return { confidence: pattern.confidence, version: resolveVersion(pattern.version, m) };
}

function wildcardKeys(map, key) {
    if (!key.endsWith('*')) return key in map ? [key] : [];
    const prefix = key.slice(0, -1);
    return Object.keys(map).filter((k) => k.startsWith(prefix));
}

function matchTechnology(tech, s, add) {
    for (const p of tech.url) { const r = testPattern(p, s.url); if (r) add('url', r); }
    for (const p of tech.html) { const r = testPattern(p, s.htmlForRegex); if (r) add('html', r); }
    for (const p of tech.text) { const r = testPattern(p, s.text); if (r) add('text', r); }
    for (const p of tech.css) { const r = testPattern(p, s.css); if (r) add('css', r); }
    if (tech.scriptSrc.length) {
        for (const p of tech.scriptSrc) {
            if (p.joined && !p.joined.test(s.scriptSrcJoined)) continue;
            for (const src of s.scriptSrc) { const r = testPattern(p, src); if (r) { add('scriptSrc', r); break; } }
        }
    }
    for (const { key, patterns } of tech.meta) {
        for (const value of s.meta[key] ?? []) for (const p of patterns) { const r = testPattern(p, value); if (r) add('meta', r); }
    }
    for (const { key, patterns } of tech.headers) {
        for (const value of s.headers[key] ?? []) for (const p of patterns) { const r = testPattern(p, value); if (r) add('headers', r); }
    }
    for (const { key, patterns } of tech.cookies) {
        for (const name of wildcardKeys(s.cookies, key)) for (const p of patterns) { const r = testPattern(p, s.cookies[name]); if (r) add('cookies', r); }
    }
    for (const { key, patterns } of tech.dns) {
        for (const value of s.dns?.[key] ?? []) for (const p of patterns) { const r = testPattern(p, value); if (r) add('dns', r); }
    }
    if (s.$ && tech.dom.length) {
        for (const rule of tech.dom) {
            if (rule.hints && !rule.hints.some((tokens) => tokens.every(s.hasToken))) continue;
            let nodes;
            try {
                nodes = s.$(rule.selector);
            } catch {
                continue; // selector syntax cheerio does not support
            }
            if (!nodes.length) continue;
            if (rule.exists) add('dom', { confidence: 100, version: null });
            if (rule.text) {
                for (const el of nodes.toArray().slice(0, 20)) {
                    const r = testPattern(rule.text, s.$(el).text()); if (r) { add('dom', r); break; }
                }
            }
            for (const { name, pattern } of rule.attributes ?? []) {
                for (const el of nodes.toArray().slice(0, 20)) {
                    const r = testPattern(pattern, s.$(el).attr(name)); if (r) { add('dom', r); break; }
                }
            }
        }
    }
}

const SKIP_VALUE_ATTRS = new Set(['d', 'points', 'viewbox', 'style']);

/** Tag/attribute names, ids and classes as a set, and attribute values as one text, for selector hints. */
function pageTokens($) {
    if (!$) return () => false;
    const names = new Set();
    const values = new Set();
    $('*').each((_, el) => {
        names.add(el.name.toLowerCase());
        for (const [k, v] of Object.entries(el.attribs ?? {})) {
            const key = k.toLowerCase();
            names.add(key);
            if (key === 'id') names.add(v.toLowerCase());
            else if (key === 'class') for (const c of v.split(/\s+/)) if (c) names.add(c.toLowerCase());
            if (v && !SKIP_VALUE_ATTRS.has(key)) values.add(v);
        }
    });
    const corpus = [...values].join('\n').toLowerCase();
    const cache = new Map();
    return (token) => {
        if (token.startsWith('n:')) return names.has(token.slice(2));
        let hit = cache.get(token);
        if (hit === undefined) cache.set(token, (hit = corpus.includes(token.slice(2))));
        return hit;
    };
}

function pickVersion(versions) {
    if (!versions.length) return null;
    const counts = new Map();
    for (const v of versions) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0];
}

/**
 * Returns the detected technologies, most confident first, with implied technologies added and
 * "excludes" / "requires" rules applied.
 */
export async function analyze(signals, fingerprints, { minConfidence = 0 } = {}) {
    const s = {
        ...signals,
        htmlForRegex: (signals.html ?? '').slice(0, MAX_HTML_FOR_REGEX),
        scriptSrcJoined: (signals.scriptSrc ?? []).join('\n'),
    };
    s.hasToken = pageTokens(signals.$);
    const found = new Map();
    const hit = (name, source, { confidence, version }) => {
        let d = found.get(name);
        if (!d) found.set(name, (d = { name, confidence: 0, versions: [], detectedBy: new Set() }));
        d.confidence = Math.min(100, d.confidence + confidence);
        if (version) d.versions.push(version);
        d.detectedBy.add(source);
    };

    // Yield to the event loop now and then: on small Apify CPU shares a long synchronous scan would
    // starve the other websites' downloads and make them time out.
    const list = fingerprints.technologies;
    for (let i = 0; i < list.length; i++) {
        if (i % 150 === 149) await new Promise((resolve) => setImmediate(resolve));
        const tech = list[i];
        matchTechnology(tech, s, (source, r) => hit(tech.name, source, r));
    }

    // Implied technologies (WordPress implies PHP), recursively.
    let changed = true;
    while (changed) {
        changed = false;
        for (const d of [...found.values()]) {
            const tech = fingerprints.byName.get(d.name);
            for (const imp of tech?.implies ?? []) {
                if (found.has(imp.name) || !fingerprints.byName.has(imp.name)) continue;
                found.set(imp.name, {
                    name: imp.name,
                    confidence: Math.min(d.confidence, imp.confidence),
                    versions: [],
                    detectedBy: new Set(['implied']),
                    impliedBy: d.name,
                });
                changed = true;
            }
        }
    }

    // "requires": only keep a technology when its parent technology (or category) is present.
    for (let pass = 0; pass < 3; pass++) {
        const cats = new Set([...found.keys()].flatMap((n) => fingerprints.byName.get(n)?.cats ?? []));
        for (const name of [...found.keys()]) {
            const tech = fingerprints.byName.get(name);
            if (tech.requires.length && !tech.requires.some((r) => found.has(r))) found.delete(name);
            else if (tech.requiresCategory.length && !tech.requiresCategory.some((c) => cats.has(c))) found.delete(name);
        }
    }
    for (const name of [...found.keys()]) {
        for (const ex of fingerprints.byName.get(name)?.excludes ?? []) if (ex !== name) found.delete(ex);
    }

    return [...found.values()]
        .filter((d) => d.confidence >= minConfidence)
        .map((d) => {
            const tech = fingerprints.byName.get(d.name);
            return {
                name: d.name,
                version: pickVersion(d.versions),
                confidence: d.confidence,
                categories: tech.categories,
                detectedBy: [...d.detectedBy],
                impliedBy: d.impliedBy ?? null,
                website: tech.website,
                description: tech.description,
                saas: tech.saas,
                oss: tech.oss,
                pricing: tech.pricing,
                cpe: tech.cpe,
            };
        })
        .sort((a, b) => (a.impliedBy ? 1 : 0) - (b.impliedBy ? 1 : 0) || b.confidence - a.confidence || a.name.localeCompare(b.name));
}

// Category groups exposed as flat columns for spreadsheets.
export const SUMMARY_COLUMNS = {
    cms: ['CMS'],
    ecommerce: ['Ecommerce'],
    analytics: ['Analytics'],
    tagManagers: ['Tag managers'],
    advertising: ['Advertising', 'Retargeting'],
    marketingAutomation: ['Marketing automation', 'CRM'],
    javascriptFrameworks: ['JavaScript frameworks'],
    webFrameworks: ['Web frameworks', 'Static site generator', 'Page builders'],
    programmingLanguages: ['Programming languages'],
    webServers: ['Web servers', 'Reverse proxies'],
    cdn: ['CDN'],
    hosting: ['Hosting', 'PaaS', 'IaaS'],
    paymentProcessors: ['Payment processors', 'Buy now pay later'],
    liveChat: ['Live chat'],
    cookieCompliance: ['Cookie compliance'],
    email: ['Email', 'Webmail'],
    security: ['Security'],
};

export function summarize(technologies) {
    const out = {};
    for (const [column, cats] of Object.entries(SUMMARY_COLUMNS)) {
        out[column] = technologies.filter((t) => t.categories.some((c) => cats.includes(c))).map((t) => t.name);
    }
    // Found only in DNS records (MX, SPF, domain verification TXT): tools the company uses, not the page itself.
    out.companyTools = technologies.filter((t) => t.detectedBy.length === 1 && t.detectedBy[0] === 'dns').map((t) => t.name);
    const byCategory = {};
    for (const t of technologies) for (const c of t.categories) (byCategory[c] ??= []).push(t.name);
    return { summary: out, byCategory };
}
