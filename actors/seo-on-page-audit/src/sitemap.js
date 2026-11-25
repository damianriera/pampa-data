// Sitemap discovery and expansion: robots.txt Sitemap lines, /sitemap.xml, sitemap indexes, gzip and plain-text sitemaps.
import { bodyText, fetchUrl } from './fetch.js';
import { parseRobots } from './robots.js';

const decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .trim();

/** { type: 'index' | 'urlset' | 'text', locs: [url] } */
export function parseSitemap(text) {
    const body = text.replace(/^﻿/, '').trim();
    if (/<sitemapindex[\s>]/i.test(body)) {
        const locs = [...body.matchAll(/<sitemap(?:\s[^>]*)?>[\s\S]*?<loc>([\s\S]*?)<\/loc>/gi)].map((m) => decode(m[1]));
        return { type: 'index', locs };
    }
    if (/<urlset[\s>]/i.test(body)) {
        const locs = [...body.matchAll(/<url(?:\s[^>]*)?>[\s\S]*?<loc>([\s\S]*?)<\/loc>/gi)].map((m) => decode(m[1]));
        return { type: 'urlset', locs };
    }
    if (!body.startsWith('<')) {
        const locs = body.split(/\s+/).filter((l) => /^https?:\/\//i.test(l));
        return { type: 'text', locs };
    }
    return { type: 'unknown', locs: [] };
}

function looksLikeSitemap(url) {
    const u = new URL(url);
    return /\.(xml|gz|txt)$/i.test(u.pathname) || /sitemap/i.test(u.pathname + u.search);
}

/** For a homepage or domain, the sitemaps listed in robots.txt, else /sitemap.xml. */
export async function discoverSitemaps(siteUrl, { getRobots }) {
    if (looksLikeSitemap(siteUrl)) return [siteUrl];
    const origin = new URL(siteUrl).origin;
    const robots = await getRobots(origin);
    const listed = parseRobots(robots?.text ?? '').sitemaps;
    return listed.length ? listed : [`${origin}/sitemap.xml`];
}

/**
 * Collects page URLs from the given websites or sitemaps, up to `limit`.
 * Returns { urls, errors }. Nested indexes are followed; at most 200 sitemap files per run.
 */
export async function collectSitemapUrls(entries, { limit, filter = null, getRobots, fetchImpl = fetch, log = () => {} }) {
    const urls = [];
    const seen = new Set();
    const errors = [];
    const queue = [];
    for (const entry of entries) {
        for (const s of await discoverSitemaps(entry, { getRobots })) queue.push({ url: s, input: entry });
    }
    const visited = new Set();
    let files = 0;
    while (queue.length && urls.length < limit && files < 200) {
        const { url, input } = queue.shift();
        if (visited.has(url)) continue;
        visited.add(url);
        files++;
        let res;
        try {
            res = await fetchUrl(url, { fetchImpl, accept: 'application/xml,text/xml,text/plain,*/*;q=0.5', maxBytes: 50 * 1024 * 1024 });
        } catch (err) {
            errors.push({ input, url, error: `Sitemap: ${err.message}` });
            continue;
        }
        if (res.statusCode >= 400) {
            errors.push({ input, url, statusCode: res.statusCode, error: `Sitemap: HTTP ${res.statusCode}` });
            continue;
        }
        const parsed = parseSitemap(bodyText(res));
        if (parsed.type === 'unknown' || parsed.locs.length === 0) {
            errors.push({ input, url, error: 'Sitemap: no URLs found (not a sitemap file?)' });
            continue;
        }
        log(`Sitemap ${url}: ${parsed.locs.length} ${parsed.type === 'index' ? 'sitemaps' : 'URLs'}`);
        if (parsed.type === 'index') {
            // Depth first, so a small maxPages does not download every child sitemap first.
            queue.unshift(...parsed.locs.map((loc) => ({ url: loc, input })));
            continue;
        }
        for (const loc of parsed.locs) {
            if (urls.length >= limit) break;
            if (seen.has(loc)) continue;
            if (filter && !filter.test(loc)) continue;
            seen.add(loc);
            urls.push(loc);
        }
    }
    return { urls, errors };
}
