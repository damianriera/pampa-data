// Finds the feeds of a website from its HTML (<link rel="alternate">) or from common feed paths.
import { load } from 'cheerio';
import { absolute } from './parse.js';

const FEED_TYPES = /^(application\/(rss|atom|rdf|feed)\+(xml|json)|application\/(rss|atom)|text\/xml|application\/xml)$/i;

// Tried in order when a page does not link its feed. Covers WordPress, Ghost, Hugo, Jekyll, Blogger, Squarespace, Substack, Medium.
export const COMMON_FEED_PATHS = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/index.xml', '/feed.json', '/feeds/posts/default', '/blog/feed', '/blog/rss.xml', '/?format=rss'];

const isCommentsFeed = (href, title) => /comments?/i.test(title ?? '') || /\/comments\/feed|\/feed\/comments|commentsrss/i.test(href ?? '');

/** Feed links declared in an HTML page, main feed first, comment feeds last. */
export function findFeedLinks(html, pageUrl) {
    const $ = load(html);
    const base = absolute($('base[href]').attr('href'), pageUrl) ?? pageUrl;
    const found = [];
    $('link[href]').each((_, el) => {
        const rel = ($(el).attr('rel') ?? '').toLowerCase().split(/\s+/);
        const type = ($(el).attr('type') ?? '').trim();
        if (!rel.includes('alternate') && !rel.includes('feed')) return;
        if (!FEED_TYPES.test(type) && !(rel.includes('feed') && !type)) return;
        const url = absolute($(el).attr('href'), base);
        if (!url || found.some((f) => f.url === url)) return;
        found.push({ url, title: $(el).attr('title')?.trim() || null, type: type || null, comments: isCommentsFeed(url, $(el).attr('title')) });
    });
    return [...found.filter((f) => !f.comments), ...found.filter((f) => f.comments)];
}

/** Candidate feed URLs to try on a website that does not declare one. */
export function commonFeedUrls(pageUrl) {
    const { origin, pathname } = new URL(pageUrl);
    const urls = [];
    const dir = pathname.replace(/\/[^/]*$/, '');
    if (dir && dir !== '/') urls.push(`${origin}${dir}/feed`, `${origin}${dir}/rss.xml`, `${origin}${dir}/index.xml`);
    for (const p of COMMON_FEED_PATHS) urls.push(`${origin}${p}`);
    return [...new Set(urls)];
}
