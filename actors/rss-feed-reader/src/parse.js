// Parses RSS 2.0, RSS 0.9x, RSS 1.0 (RDF), Atom 1.0/0.3 and JSON Feed 1.x into one item schema.
import { load } from 'cheerio';
import { decodeHTML } from 'entities';
import { XMLParser } from 'fast-xml-parser';

export class NotAFeedError extends Error {}

const ARRAY_TAGS = new Set([
    'item', 'entry', 'category', 'link', 'enclosure', 'author', 'contributor', 'media:content', 'media:thumbnail',
    'media:group', 'atom:link', 'dc:subject', 'itunes:category',
]);

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    htmlEntities: true,
    ignoreDeclaration: true,
    ignorePiTags: true,
    isArray: (name) => ARRAY_TAGS.has(name),
    // Atom text constructs can hold inline XHTML; keep them raw so mixed text keeps its order.
    stopNodes: ['feed.entry.content', 'feed.entry.summary', 'feed.entry.title', 'feed.title', 'feed.subtitle'],
});

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const attr = (node, name) => (node && typeof node === 'object' ? node[`@_${name}`] : undefined);

/** All text inside a parsed XML node (handles plain strings, {#text}, nested XHTML). */
export function textOf(node) {
    if (node == null) return '';
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return String(node).trim();
    if (Array.isArray(node)) return node.map(textOf).filter(Boolean).join(' ').trim();
    if (typeof node === 'object') {
        return Object.entries(node)
            .filter(([k]) => !k.startsWith('@_'))
            .map(([, v]) => textOf(v))
            .filter(Boolean)
            .join(' ')
            .trim();
    }
    return '';
}

const BLOCK_END = /<\/?(br|p|div|li|ul|ol|h[1-6]|tr|table|blockquote|pre|section|article|figure|figcaption|hr)\b[^>]*>/gi;

/** HTML -> readable plain text. `paragraphs` keeps line breaks between blocks; otherwise one line. */
export function htmlToText(html, { paragraphs = false } = {}) {
    if (!html) return '';
    if (!/[<&]/.test(html)) return paragraphs ? html.trim() : html.replace(/\s+/g, ' ').trim();
    const $ = load(html.replace(BLOCK_END, '\n'), null, false);
    $('script, style, noscript').remove();
    const text = $.root().text();
    if (!paragraphs) return text.replace(/\s+/g, ' ').trim();
    return text
        .split('\n')
        .map((line) => line.replace(/[ \t\f\v ]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function firstImageIn(html, base) {
    if (!html || !/<img/i.test(html)) return null;
    const src = load(html, null, false)('img[src]').first().attr('src');
    return absolute(src, base);
}

export function absolute(url, base) {
    if (!url || typeof url !== 'string') return null;
    const u = url.trim();
    if (!u || u.startsWith('data:')) return null;
    try {
        const out = new URL(u, base || undefined);
        return ['http:', 'https:'].includes(out.protocol) ? out.href : null;
    } catch {
        return null;
    }
}

/** RFC 822, ISO 8601 and the usual sloppy variants -> ISO string, or null. */
export function toIsoDate(value) {
    const s = textOf(value).replace(/\s+/g, ' ');
    if (!s) return null;
    let t = Date.parse(s);
    if (Number.isNaN(t)) {
        // "Mon, 24 Nov 2026 10:00:00 CET", "24 Nov 2026 10:00 +0100 (UTC)", "2026-11-24 10:00:00"
        const cleaned = s
            .replace(/\s*\([^)]*\)\s*$/, '')
            .replace(/\b(CET|CEST|BST|IST|AEST|AEDT|JST|KST|MSK)\b/, (z) => ({ CET: '+0100', CEST: '+0200', BST: '+0100', IST: '+0530', AEST: '+1000', AEDT: '+1100', JST: '+0900', KST: '+0900', MSK: '+0300' }[z]))
            .replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/, '$1T$2')
            .replace(/^[A-Za-z]+,?\s+/, '');
        t = Date.parse(cleaned);
    }
    if (Number.isNaN(t)) return null;
    const year = new Date(t).getUTCFullYear();
    return year < 1990 || year > 2100 ? null : new Date(t).toISOString();
}

/** "3605", "1:00:05", "60:05" -> seconds. */
export function durationSeconds(value) {
    const s = textOf(value);
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));
    const parts = s.split(':').map(Number);
    if (parts.length < 2 || parts.length > 3 || parts.some((n) => !Number.isFinite(n))) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
}

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const HAS_EMAIL = /[\w.+-]+@[\w-]+\.[\w-]+/;

/** Author names without e-mail addresses ("jane@x.com (Jane Doe)" -> "Jane Doe"). */
export function cleanAuthor(value) {
    let s = textOf(value);
    if (!s) return null;
    const paren = /\(([^)]+)\)/.exec(s);
    if (HAS_EMAIL.test(s) && paren) s = paren[1];
    s = s.replace(EMAIL, '').replace(/[()<>]/g, ' ').replace(/\s+/g, ' ').trim();
    return s || null;
}

function uniq(list) {
    return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}

function mediaImage(node, base) {
    for (const thumb of arr(node['media:thumbnail'])) {
        const u = absolute(attr(thumb, 'url'), base);
        if (u) return u;
    }
    for (const m of arr(node['media:content'])) {
        const type = attr(m, 'type') ?? '';
        const medium = attr(m, 'medium') ?? '';
        if (medium === 'image' || type.startsWith('image/') || (!medium && !type && /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(attr(m, 'url') ?? ''))) {
            const u = absolute(attr(m, 'url'), base);
            if (u) return u;
        }
        const nestedThumb = mediaImage(m, base);
        if (nestedThumb) return nestedThumb;
    }
    for (const group of arr(node['media:group'])) {
        const u = mediaImage(group, base);
        if (u) return u;
    }
    return null;
}

// Text conversion is the expensive part (a 20 MB podcast feed has 3,000 items), so it runs later, only for kept items.
function finishItem(raw, { summaryHtml, contentHtml, base }) {
    return { ...raw, summaryHtml: summaryHtml || null, contentHtml: contentHtml || null, base };
}

/** Adds summary, contentText and a fallback image (first <img>) to an item from parseFeed. */
export function materialize(item) {
    if (item.summary !== undefined) return item;
    const summarySource = item.summaryHtml || item.contentHtml || '';
    const contentSource = item.contentHtml || item.summaryHtml || '';
    item.image = item.image ?? firstImageIn(contentSource, item.base) ?? firstImageIn(summarySource, item.base);
    item.summary = htmlToText(summarySource) || null;
    item.contentText = htmlToText(contentSource, { paragraphs: true }) || null;
    item.contentHtml = contentSource || null;
    return item;
}

function parseRssItem(item, feedLink) {
    const atomLinks = arr(item['atom:link']);
    const guidNode = item.guid;
    const guid = textOf(guidNode) || null;
    const guidIsLink = guid && attr(guidNode, 'isPermaLink') !== 'false' && /^https?:\/\//i.test(guid);
    const link = absolute(textOf(arr(item.link)[0]), feedLink)
        ?? absolute(attr(atomLinks.find((l) => !attr(l, 'rel') || attr(l, 'rel') === 'alternate'), 'href'), feedLink)
        ?? (guidIsLink ? absolute(guid, feedLink) : null)
        ?? absolute(attr(item, 'rdf:about'), feedLink);
    const base = link ?? feedLink;
    const enclosures = arr(item.enclosure);
    const enclosure = enclosures.find((e) => !(attr(e, 'type') ?? '').startsWith('image/')) ?? null;
    const imageEnclosure = enclosures.find((e) => (attr(e, 'type') ?? '').startsWith('image/'));
    const image = mediaImage(item, base)
        ?? absolute(attr(item['itunes:image'], 'href'), base)
        ?? absolute(attr(imageEnclosure, 'url'), base);
    const lengthBytes = Number(attr(enclosure, 'length'));
    return finishItem({
        title: htmlToText(textOf(item.title)) || null,
        link,
        guid: guid ?? link,
        published: toIsoDate(item.pubDate) ?? toIsoDate(item['dc:date']) ?? toIsoDate(item.published) ?? toIsoDate(item['atom:published']),
        updated: toIsoDate(item['atom:updated']) ?? toIsoDate(item.updated) ?? toIsoDate(item['dc:modified']),
        author: cleanAuthor(item['dc:creator']) ?? cleanAuthor(item.author) ?? cleanAuthor(item['itunes:author']),
        categories: uniq([...arr(item.category), ...arr(item['dc:subject'])].map(textOf)),
        image,
        enclosureUrl: absolute(attr(enclosure, 'url'), base),
        enclosureType: attr(enclosure, 'type') ?? null,
        enclosureLengthBytes: Number.isFinite(lengthBytes) && lengthBytes > 0 ? lengthBytes : null,
        durationSeconds: durationSeconds(item['itunes:duration']),
        commentsUrl: absolute(textOf(item.comments), base),
    }, {
        summaryHtml: textOf(item.description) || textOf(item['itunes:summary']) || textOf(item['media:description']),
        contentHtml: textOf(item['content:encoded']) || textOf(item['itunes:summary']),
        base,
    });
}

function atomLink(links, base, rel = 'alternate') {
    const matching = arr(links).filter((l) => (attr(l, 'rel') ?? 'alternate') === rel);
    const best = matching.find((l) => /html/.test(attr(l, 'type') ?? 'text/html')) ?? matching[0];
    return absolute(attr(best, 'href') ?? (typeof best === 'string' ? best : null), base);
}

/** Text of an Atom text construct kept raw by stopNodes: xhtml as is, html/text with CDATA and entities decoded. */
function atomText(node) {
    if (node == null) return '';
    const raw = typeof node === 'object' ? (node['#text'] ?? '') : String(node);
    if (typeof node === 'object' && attr(node, 'type') === 'xhtml') return String(raw).trim();
    const unwrapped = String(raw).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
    return (/<!\[CDATA\[/.test(String(raw)) ? unwrapped : decodeHTML(unwrapped)).trim();
}

function parseAtomEntry(entry, feedBase, feedAuthor) {
    const base = absolute(attr(entry, 'xml:base'), feedBase) ?? feedBase;
    const link = atomLink(entry.link, base);
    const enclosure = arr(entry.link).find((l) => attr(l, 'rel') === 'enclosure');
    const lengthBytes = Number(attr(enclosure, 'length'));
    const authors = arr(entry.author).map((a) => cleanAuthor(a?.name ?? a)).filter(Boolean);
    return finishItem({
        title: htmlToText(atomText(entry.title)) || null,
        link,
        guid: textOf(entry.id) || link,
        published: toIsoDate(entry.published) ?? toIsoDate(entry.issued) ?? toIsoDate(entry.updated) ?? toIsoDate(entry.modified),
        updated: toIsoDate(entry.updated) ?? toIsoDate(entry.modified),
        author: authors.length ? authors.join(', ') : feedAuthor,
        categories: uniq(arr(entry.category).map((c) => attr(c, 'label') ?? attr(c, 'term') ?? textOf(c))),
        image: mediaImage(entry, link ?? base),
        enclosureUrl: absolute(attr(enclosure, 'href'), base),
        enclosureType: attr(enclosure, 'type') ?? null,
        enclosureLengthBytes: Number.isFinite(lengthBytes) && lengthBytes > 0 ? lengthBytes : null,
        durationSeconds: null,
        commentsUrl: atomLink(entry.link, base, 'replies'),
    }, {
        summaryHtml: atomText(entry.summary) || atomText(entry['media:group']?.[0]?.['media:description']),
        contentHtml: atomText(entry.content),
        base: link ?? base,
    });
}

function parseJsonFeed(json, feedUrl) {
    if (!json || typeof json !== 'object' || !Array.isArray(json.items)) throw new NotAFeedError('JSON without an "items" list');
    if (json.version && !/jsonfeed\.org/.test(String(json.version))) throw new NotAFeedError('JSON is not a JSON Feed');
    const feedLink = absolute(json.home_page_url, feedUrl) ?? feedUrl;
    const names = (a) => arr(a).map((x) => cleanAuthor(x?.name)).filter(Boolean);
    const feedAuthors = [...names(json.authors), ...names(json.author)];
    const items = json.items.map((it) => {
        const link = absolute(it.url, feedLink) ?? absolute(it.external_url, feedLink);
        const att = arr(it.attachments)[0];
        const authors = [...names(it.authors), ...names(it.author)];
        return finishItem({
            title: htmlToText(String(it.title ?? '')) || null,
            link,
            guid: it.id != null ? String(it.id) : link,
            published: toIsoDate(it.date_published) ?? toIsoDate(it.date_modified),
            updated: toIsoDate(it.date_modified),
            author: (authors.length ? authors : feedAuthors).join(', ') || null,
            categories: uniq(arr(it.tags).map(String)),
            image: absolute(it.image, link ?? feedLink) ?? absolute(it.banner_image, link ?? feedLink),
            enclosureUrl: absolute(att?.url, feedLink),
            enclosureType: att?.mime_type ?? null,
            enclosureLengthBytes: Number(att?.size_in_bytes) > 0 ? Number(att.size_in_bytes) : null,
            durationSeconds: Number(att?.duration_in_seconds) > 0 ? Math.round(Number(att.duration_in_seconds)) : null,
            commentsUrl: null,
        }, {
            summaryHtml: it.summary ? String(it.summary) : '',
            contentHtml: it.content_html ? String(it.content_html) : (it.content_text ? String(it.content_text) : ''),
            base: link ?? feedLink,
        });
    });
    return {
        feed: {
            feedType: 'json',
            title: htmlToText(String(json.title ?? '')) || null,
            link: feedLink,
            description: json.description ? htmlToText(String(json.description)) : null,
            language: json.language ?? null,
            image: absolute(json.icon, feedLink) ?? absolute(json.favicon, feedLink),
            lastUpdated: null,
            generator: null,
        },
        items,
    };
}

/** True when the text looks like an HTML page (not a feed). */
export function looksLikeHtml(text) {
    const head = text.slice(0, 2048).replace(/^﻿/, '').trimStart().toLowerCase();
    return head.startsWith('<!doctype html') || head.startsWith('<html') || (/<html[\s>]/.test(head) && !/<(rss|feed|rdf:rdf)[\s>]/.test(head));
}

/**
 * Parse a feed document. Returns { feed, items } or throws NotAFeedError.
 * `feedUrl` is the final URL the feed came from (used to resolve relative links).
 */
export function parseFeed(text, feedUrl) {
    const trimmed = text.replace(/^﻿/, '').trimStart();
    if (trimmed.startsWith('{')) {
        let json;
        try {
            json = JSON.parse(trimmed);
        } catch {
            throw new NotAFeedError('Invalid JSON');
        }
        return parseJsonFeed(json, feedUrl);
    }
    if (!trimmed.startsWith('<')) throw new NotAFeedError('Not XML or JSON');
    if (looksLikeHtml(trimmed)) throw new NotAFeedError('HTML page, not a feed');
    let doc;
    try {
        doc = parser.parse(trimmed);
    } catch (err) {
        throw new NotAFeedError(`Invalid XML: ${err.message.split('\n')[0]}`);
    }

    if (doc.rss || doc['rdf:RDF'] || doc.RDF) {
        const root = doc.rss ?? doc['rdf:RDF'] ?? doc.RDF;
        const channel = (Array.isArray(root.channel) ? root.channel[0] : root.channel) ?? {};
        const feedLink = absolute(textOf(arr(channel.link)[0]), feedUrl)
            ?? absolute(attr(arr(channel['atom:link']).find((l) => attr(l, 'rel') === 'alternate'), 'href'), feedUrl)
            ?? feedUrl;
        const rawItems = arr(channel.item).length ? arr(channel.item) : arr(root.item);
        const imageNode = Array.isArray(channel.image) ? channel.image[0] : channel.image;
        return {
            feed: {
                feedType: doc.rss ? 'rss' : 'rss1',
                title: htmlToText(textOf(channel.title)) || null,
                link: feedLink,
                description: htmlToText(textOf(channel.description)) || null,
                language: textOf(channel.language) || textOf(channel['dc:language']) || attr(root, 'xml:lang') || null,
                image: absolute(textOf(imageNode?.url), feedLink) ?? absolute(attr(channel['itunes:image'], 'href'), feedLink),
                lastUpdated: toIsoDate(channel.lastBuildDate) ?? toIsoDate(channel.pubDate) ?? toIsoDate(channel['dc:date']),
                generator: textOf(channel.generator) || null,
            },
            items: rawItems.map((it) => parseRssItem(it, feedLink)),
        };
    }

    if (doc.feed) {
        const feed = Array.isArray(doc.feed) ? doc.feed[0] : doc.feed;
        const base = absolute(attr(feed, 'xml:base'), feedUrl) ?? feedUrl;
        const feedLink = atomLink(feed.link, base) ?? base;
        const feedAuthor = arr(feed.author).map((a) => cleanAuthor(a?.name ?? a)).filter(Boolean).join(', ') || null;
        return {
            feed: {
                feedType: 'atom',
                title: htmlToText(atomText(feed.title)) || null,
                link: feedLink,
                description: htmlToText(atomText(feed.subtitle) || atomText(feed.tagline)) || null,
                language: attr(feed, 'xml:lang') ?? null,
                image: absolute(textOf(feed.logo), base) ?? absolute(textOf(feed.icon), base),
                lastUpdated: toIsoDate(feed.updated) ?? toIsoDate(feed.modified),
                generator: textOf(feed.generator) || null,
            },
            items: arr(feed.entry).map((e) => parseAtomEntry(e, base, feedAuthor)),
        };
    }

    throw new NotAFeedError(`XML but not a feed (root element: ${Object.keys(doc).find((k) => !k.startsWith('?')) ?? 'none'})`);
}
