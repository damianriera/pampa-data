// Downloads the open webappanalyzer fingerprints (GPL-3.0, https://github.com/enthec/webappanalyzer)
// and writes a trimmed copy to data/. Only the fields this Actor can check from one plain HTTP response
// and DNS are kept (no browser-only "js", "xhr" or "dom properties").
// Usage: npm run update-fingerprints [-- <git ref>]
import { writeFile } from 'node:fs/promises';

const ref = process.argv[2] ?? 'main';
const base = `https://raw.githubusercontent.com/enthec/webappanalyzer/${ref}/src`;
const KEEP = ['cats', 'website', 'description', 'cpe', 'saas', 'oss', 'pricing', 'implies', 'excludes', 'requires',
    'requiresCategory', 'headers', 'cookies', 'meta', 'html', 'scriptSrc', 'url', 'text', 'css', 'dom', 'dns'];
const DETECTORS = ['headers', 'cookies', 'meta', 'html', 'scriptSrc', 'url', 'text', 'css', 'dom', 'dns', 'implies'];

async function get(path) {
    const res = await fetch(`${base}/${path}`);
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.json();
}

const technologies = {};
for (const letter of ['_', ...'abcdefghijklmnopqrstuvwxyz']) {
    Object.assign(technologies, await get(`technologies/${letter}.json`));
}
const trimmed = {};
for (const [name, tech] of Object.entries(technologies).sort(([a], [b]) => a.localeCompare(b))) {
    const t = {};
    for (const key of KEEP) if (tech[key] !== undefined) t[key] = tech[key];
    // Drop browser-only DOM checks (JS properties); keep existence, attributes and text.
    if (t.dom && typeof t.dom === 'object' && !Array.isArray(t.dom)) {
        for (const [sel, rule] of Object.entries(t.dom)) {
            if (rule && typeof rule === 'object' && rule.properties) {
                const { properties, ...rest } = rule;
                if (Object.keys(rest).length) t.dom[sel] = rest; else delete t.dom[sel];
            }
        }
        if (!Object.keys(t.dom).length) delete t.dom;
    }
    // Technologies we cannot detect at all are still kept when other technologies imply them.
    trimmed[name] = t;
}
const categories = await get('categories.json');
const groups = await get('groups.json');

await writeFile(new URL('../data/technologies.json', import.meta.url), JSON.stringify(trimmed));
await writeFile(new URL('../data/categories.json', import.meta.url), JSON.stringify({ categories, groups }, null, 1));
const detectable = Object.values(trimmed).filter((t) => DETECTORS.some((k) => t[k] !== undefined)).length;
const source = `# Fingerprint data\n\nFrom [enthec/webappanalyzer](https://github.com/enthec/webappanalyzer) (ref \`${ref}\`), downloaded ${new Date().toISOString().slice(0, 10)}.\nLicensed under GPL-3.0 (see LICENSE in this folder). Trimmed by \`scripts/update-fingerprints.mjs\`.\n\n${Object.keys(trimmed).length} technologies, ${detectable} with a pattern this Actor can check, ${Object.keys(categories).length} categories.\n`;
await writeFile(new URL('../data/SOURCE.md', import.meta.url), source);
console.log(source);
