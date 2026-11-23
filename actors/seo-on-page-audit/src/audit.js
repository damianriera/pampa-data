// Turns one fetched page into an SEO audit row: metadata, indexability, headings, social tags, structured data,
// images, links and a list of issues.
import * as cheerio from 'cheerio';

import { bodyText } from './fetch.js';

export const LIMITS = {
    titleMin: 30,
    titleMax: 60,
    descriptionMin: 70,
    descriptionMax: 160,
    minWords: 300,
    slowMs: 1500,
    maxRedirects: 1,
};

export const ISSUE_TEXT = {
    http_error: 'Page does not return 200',
    not_html: 'Not an HTML page',
    redirect_chain: 'More than one redirect before the final page',
    redirected: 'URL redirects to another page',
    insecure_http: 'Final page is served over HTTP, not HTTPS',
    slow_response: `Server took more than ${LIMITS.slowMs / 1000} s to answer`,
    title_missing: 'Title tag is missing or empty',
    title_too_long: `Title is longer than ${LIMITS.titleMax} characters (may be cut in search results)`,
    title_too_short: `Title is shorter than ${LIMITS.titleMin} characters`,
    multiple_titles: 'More than one title tag',
    description_missing: 'Meta description is missing or empty',
    description_too_long: `Meta description is longer than ${LIMITS.descriptionMax} characters`,
    description_too_short: `Meta description is shorter than ${LIMITS.descriptionMin} characters`,
    h1_missing: 'No H1 heading',
    multiple_h1: 'More than one H1 heading',
    canonical_missing: 'No canonical link',
    canonical_other_page: 'Canonical points to a different URL',
    multiple_canonicals: 'More than one canonical link',
    noindex: 'Page asks search engines not to index it (meta robots or X-Robots-Tag)',
    blocked_by_robots_txt: 'robots.txt blocks Googlebot from this URL',
    lang_missing: 'No lang attribute on the html tag',
    viewport_missing: 'No mobile viewport meta tag',
    images_missing_alt: 'Some images have no alt attribute',
    low_word_count: `Fewer than ${LIMITS.minWords} words of visible text`,
    og_missing: 'Open Graph title or image missing (poor previews when shared)',
    structured_data_missing: 'No JSON-LD structured data',
};

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const nullIfEmpty = (s) => (s ? s : null);

function absolute(href, base) {
    try {
        const u = new URL(href, base);
        u.hash = '';
        return u.href;
    } catch {
        return null;
    }
}

function jsonLdTypes($) {
    const types = new Set();
    let invalid = 0;
    const visit = (node) => {
        if (Array.isArray(node)) return node.forEach(visit);
        if (!node || typeof node !== 'object') return;
        const t = node['@type'];
        if (typeof t === 'string') types.add(t);
        else if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && types.add(x));
        if (node['@graph']) visit(node['@graph']);
        for (const [k, v] of Object.entries(node)) {
            if (k !== '@graph' && v && typeof v === 'object') visit(v);
        }
    };
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            visit(JSON.parse($(el).text().trim()));
        } catch {
            invalid++;
        }
    });
    return { types: [...types], invalid };
}

function metaContent($, selector) {
    return nullIfEmpty(clean($(selector).first().attr('content')));
}

/** HTML by content type, or a page without one that starts like HTML. */
export function isHtmlResponse(response) {
    if (response.contentType) return /html/i.test(response.contentType);
    return /<html|<head|<title/i.test(response.buffer.subarray(0, 2000).toString('utf8'));
}

/**
 * @param response result of fetchUrl
 * @param opts { robotsTxtAllowed: boolean|null, includeLinks, includeHeadings }
 */
export function auditPage(response, { robotsTxtAllowed = null, includeLinks = false, includeHeadings = true } = {}) {
    const finalUrl = response.url;
    const isHtml = isHtmlResponse(response);
    const html = isHtml ? bodyText(response) : '';
    const $ = cheerio.load(html);

    const xRobotsTag = nullIfEmpty(clean(response.headers['x-robots-tag']));
    const metaRobots = [metaContent($, 'meta[name="robots" i]'), metaContent($, 'meta[name="googlebot" i]')].filter(Boolean).join(', ') || null;
    const noindex = /noindex|none/i.test(`${metaRobots ?? ''} ${xRobotsTag ?? ''}`);
    const nofollow = /nofollow|none/i.test(`${metaRobots ?? ''} ${xRobotsTag ?? ''}`);

    const titles = $('head title, title').filter((_, el) => $(el).parents('svg').length === 0);
    const title = nullIfEmpty(clean(titles.first().text()));
    const description = metaContent($, 'meta[name="description" i]');

    const canonicalTags = $('link[rel~="canonical" i]');
    const canonicalHref = canonicalTags.first().attr('href');
    let canonical = canonicalHref ? absolute(canonicalHref.trim(), finalUrl) : null;
    const headerCanonical = (response.headers.link ?? '').match(/<([^>]+)>\s*;\s*rel="?canonical"?/i);
    if (!canonical && headerCanonical) canonical = absolute(headerCanonical[1], finalUrl);
    const canonicalIsSelf = canonical ? canonical === absolute(finalUrl, finalUrl) : null;

    const hreflang = $('link[rel~="alternate" i][hreflang]').map((_, el) => ({
        lang: $(el).attr('hreflang'),
        url: absolute($(el).attr('href') ?? '', finalUrl),
    })).get();

    const h1 = $('h1').map((_, el) => clean($(el).text())).get();
    const h2 = $('h2').map((_, el) => clean($(el).text())).get();
    const headingCounts = Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`h${n}`, $(`h${n}`).length]));

    const og = {
        title: metaContent($, 'meta[property="og:title" i]'),
        description: metaContent($, 'meta[property="og:description" i]'),
        image: metaContent($, 'meta[property="og:image" i]'),
        type: metaContent($, 'meta[property="og:type" i]'),
        url: metaContent($, 'meta[property="og:url" i]'),
        siteName: metaContent($, 'meta[property="og:site_name" i]'),
    };
    const twitter = {
        card: metaContent($, 'meta[name="twitter:card" i]'),
        title: metaContent($, 'meta[name="twitter:title" i]'),
        description: metaContent($, 'meta[name="twitter:description" i]'),
        image: metaContent($, 'meta[name="twitter:image" i]'),
    };
    const ld = jsonLdTypes($);

    const images = $('img');
    const imagesMissingAlt = images.filter((_, el) => $(el).attr('alt') === undefined).length;
    const imagesEmptyAlt = images.filter((_, el) => ($(el).attr('alt') ?? 'x').trim() === '').length;

    const host = new URL(finalUrl).hostname.replace(/^www\./, '');
    const internal = new Map();
    const external = new Map();
    let nofollowLinks = 0;
    $('a[href]').each((_, el) => {
        const href = ($(el).attr('href') ?? '').trim();
        if (!href || /^(javascript|mailto|tel|data):/i.test(href) || href.startsWith('#')) return;
        const abs = absolute(href, finalUrl);
        if (!abs || !/^https?:/.test(abs)) return;
        if (/\bnofollow\b/i.test($(el).attr('rel') ?? '')) nofollowLinks++;
        const linkHost = new URL(abs).hostname.replace(/^www\./, '');
        const target = linkHost === host ? internal : external;
        if (!target.has(abs)) target.set(abs, clean($(el).text()).slice(0, 200) || clean($(el).find('img').attr('alt')) || null);
    });

    // Last use of the document, so the tags can be removed in place instead of parsing the page twice.
    $('script, style, noscript, template, svg').remove();
    const visibleText = clean($('body').text());
    const wordCount = visibleText ? visibleText.split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0;

    const lang = nullIfEmpty(clean($('html').attr('lang')));
    const viewport = metaContent($, 'meta[name="viewport" i]');
    const charset = nullIfEmpty(clean($('meta[charset]').attr('charset'))) ?? (response.contentType.match(/charset=([^;]+)/i)?.[1] ?? null);

    // Issues
    const issues = [];
    const add = (code) => issues.push(code);
    if (response.statusCode !== 200) add('http_error');
    if (!isHtml) add('not_html');
    if (response.redirectChain.length > LIMITS.maxRedirects) add('redirect_chain');
    else if (response.redirectChain.length === 1) add('redirected');
    if (finalUrl.startsWith('http:')) add('insecure_http');
    if (response.responseTimeMs > LIMITS.slowMs) add('slow_response');
    if (isHtml && response.statusCode === 200) {
        if (!title) add('title_missing');
        else if (title.length > LIMITS.titleMax) add('title_too_long');
        else if (title.length < LIMITS.titleMin) add('title_too_short');
        if (titles.length > 1) add('multiple_titles');
        if (!description) add('description_missing');
        else if (description.length > LIMITS.descriptionMax) add('description_too_long');
        else if (description.length < LIMITS.descriptionMin) add('description_too_short');
        if (h1.length === 0) add('h1_missing');
        else if (h1.length > 1) add('multiple_h1');
        if (!canonical) add('canonical_missing');
        else if (canonicalIsSelf === false) add('canonical_other_page');
        if (canonicalTags.length > 1) add('multiple_canonicals');
        if (!lang) add('lang_missing');
        if (!viewport) add('viewport_missing');
        if (imagesMissingAlt > 0) add('images_missing_alt');
        if (wordCount < LIMITS.minWords) add('low_word_count');
        if (!og.title || !og.image) add('og_missing');
        if (ld.types.length === 0) add('structured_data_missing');
    }
    if (noindex) add('noindex');
    if (robotsTxtAllowed === false) add('blocked_by_robots_txt');

    const indexable = response.statusCode === 200 && isHtml && !noindex && robotsTxtAllowed !== false && canonicalIsSelf !== false;

    const item = {
        url: response.requestedUrl,
        finalUrl,
        statusCode: response.statusCode,
        redirectCount: response.redirectChain.length,
        redirectChain: response.redirectChain,
        responseTimeMs: response.responseTimeMs,
        contentType: nullIfEmpty(response.contentType.split(';')[0].trim()),
        pageSizeKb: Math.round(response.bytes / 102.4) / 10,
        indexable,
        issueCount: issues.length,
        issues,
        issuesText: issues.map((c) => ISSUE_TEXT[c]).join('; ') || null,
        title,
        titleLength: title?.length ?? 0,
        metaDescription: description,
        metaDescriptionLength: description?.length ?? 0,
        canonical,
        canonicalIsSelf,
        metaRobots,
        xRobotsTag,
        noindex,
        nofollow,
        robotsTxtAllowed,
        lang,
        hreflang,
        h1,
        h1Count: h1.length,
        h2Count: h2.length,
        headingCounts,
        wordCount,
        openGraph: og,
        twitterCard: twitter,
        jsonLdTypes: ld.types,
        jsonLdInvalidBlocks: ld.invalid,
        imageCount: images.length,
        imagesMissingAlt,
        imagesEmptyAlt,
        internalLinkCount: internal.size,
        externalLinkCount: external.size,
        nofollowLinkCount: nofollowLinks,
        viewport,
        charset,
        xFrameOptions: response.headers['x-frame-options'] ?? null,
        server: response.headers.server ?? null,
        lastModified: response.headers['last-modified'] ?? null,
        htmlTruncated: response.truncated,
        checkedAt: new Date().toISOString(),
    };
    if (includeHeadings) item.h2 = h2.slice(0, 30);
    if (includeLinks) {
        item.internalLinks = [...internal].map(([url, text]) => ({ url, text }));
        item.externalLinks = [...external].map(([url, text]) => ({ url, text }));
    }
    return item;
}

/** Run-level summary: issue counts and pages sharing the same title or description. */
export function summarize(items) {
    const issueCounts = {};
    for (const it of items) for (const c of it.issues) issueCounts[c] = (issueCounts[c] ?? 0) + 1;
    const dupes = (field) => {
        const map = new Map();
        for (const it of items) {
            const v = it[field];
            if (!v || !it.indexable) continue;
            map.set(v, [...(map.get(v) ?? []), it.finalUrl]);
        }
        return [...map].filter(([, urls]) => urls.length > 1).map(([value, urls]) => ({ value, count: urls.length, urls: urls.slice(0, 50) }))
            .sort((a, b) => b.count - a.count);
    };
    return {
        pagesAudited: items.length,
        indexablePages: items.filter((i) => i.indexable).length,
        averageResponseTimeMs: items.length ? Math.round(items.reduce((s, i) => s + i.responseTimeMs, 0) / items.length) : null,
        issueCounts: Object.fromEntries(Object.entries(issueCounts).sort((a, b) => b[1] - a[1])
            .map(([code, count]) => [code, { count, meaning: ISSUE_TEXT[code] }])),
        duplicateTitles: dupes('title'),
        duplicateDescriptions: dupes('metaDescription'),
    };
}
