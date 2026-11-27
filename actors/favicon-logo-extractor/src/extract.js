// Finds every icon and logo a homepage declares: <link rel=icon>, apple-touch-icon, mask-icon, the web app manifest,
// og:image / twitter:image, msapplication tiles, JSON-LD logo and the logo image (or inline SVG) in the page header.
import * as cheerio from 'cheerio';

export const MAX_INLINE_SVG_BYTES = 30 * 1024;

const ICON_RELS = {
    icon: 'icon',
    'shortcut icon': 'icon',
    'apple-touch-icon': 'apple-touch-icon',
    'apple-touch-icon-precomposed': 'apple-touch-icon',
    'mask-icon': 'mask-icon',
    'fluid-icon': 'icon',
};

export function resolveUrl(value, base) {
    if (typeof value !== 'string') return null;
    const s = value.trim();
    if (!s) return null;
    if (/^data:/i.test(s)) return s.length <= 64 * 1024 && /^data:image\//i.test(s) ? s : null;
    try {
        const url = new URL(s, base);
        if (!['http:', 'https:'].includes(url.protocol)) return null;
        url.hash = '';
        return url.href;
    } catch {
        return null;
    }
}

/** "16x16 32x32" -> [{width:16,height:16},...]; "any" -> [{any:true}]. */
export function parseSizes(value) {
    if (typeof value !== 'string' || !value.trim()) return [];
    return value.trim().split(/\s+/).map((part) => {
        if (/^any$/i.test(part)) return { any: true };
        const m = /^(\d+)[x×](\d+)$/i.exec(part);
        return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
    }).filter(Boolean);
}

export function normalizeColor(value) {
    if (typeof value !== 'string') return null;
    const s = value.trim();
    if (!s || s.length > 40) return null;
    if (/^#[0-9a-f]{3,8}$/i.test(s)) return s.toLowerCase();
    if (/^(rgb|hsl)a?\([^)]*\)$/i.test(s) || /^[a-z]{3,20}$/i.test(s)) return s;
    return null;
}

/** Collects logo values from parsed JSON-LD (Organization.logo, publisher.logo, any @graph node). */
export function jsonLdLogos(data) {
    const out = [];
    const seen = new Set();
    const visit = (node, depth) => {
        if (!node || typeof node !== 'object' || depth > 6 || seen.has(node)) return;
        seen.add(node);
        if (Array.isArray(node)) {
            for (const n of node) visit(n, depth + 1);
            return;
        }
        const logo = node.logo;
        const take = (v) => {
            if (typeof v === 'string') out.push(v);
            else if (v && typeof v === 'object') {
                const u = v.url ?? v.contentUrl ?? v['@id'];
                if (typeof u === 'string') out.push(u);
            }
        };
        if (Array.isArray(logo)) logo.forEach(take);
        else take(logo);
        for (const [k, v] of Object.entries(node)) if (k !== 'logo' && v && typeof v === 'object') visit(v, depth + 1);
    };
    visit(data, 0);
    return out;
}

const NOT_OWN_LOGO = /customer|client|partner|testimonial|press|featured|trusted|sponsor|carousel|slider|marquee|integration|award|case-stud|card|hero|banner-image|gallery|footer/i;

function attrs($n) {
    return [$n.attr('class'), $n.attr('id'), $n.attr('data-testid')].filter(Boolean).join(' ');
}

function inHomeLink($, el, pageUrl) {
    const a = $(el).closest('a');
    if (!a.length) return false;
    const href = a.attr('href');
    if (!href) return false;
    try {
        const target = new URL(href, pageUrl);
        const page = new URL(pageUrl);
        return target.hostname.replace(/^www\./, '') === page.hostname.replace(/^www\./, '') && /^\/?([a-z]{2}([-_][a-z]{2})?\/?)?$/i.test(target.pathname.replace(/\/index\.\w+$/, '/'));
    } catch {
        return false;
    }
}

/**
 * How likely an <img>/<svg> is the site's own logo. Links to the homepage, header placement, "logo" in class or id,
 * and the brand name in alt text add points; customer/partner strips, carousels and long photo descriptions remove them.
 */
export function logoScore($, el, pageUrl, brand) {
    const $el = $(el);
    let score = 0;
    const own = [attrs($el), $el.attr('alt'), $el.attr('aria-label'), $el.attr('title')].filter(Boolean).join(' ');
    let ancestors = '';
    let node = el.parent;
    for (let i = 0; i < 4 && node && node.type === 'tag'; i++, node = node.parent) ancestors += ` ${attrs($(node))} ${$(node).attr('aria-label') ?? ''}`;
    const label = ($el.attr('alt') ?? $el.attr('aria-label') ?? $el.find('title').first().text() ?? '').trim();
    const src = $el.attr('src') ?? $el.attr('data-src') ?? '';

    if (inHomeLink($, el, pageUrl)) score += 3;
    if ($el.closest('header, nav, [role="banner"]').length || /header|navbar|masthead|topbar/i.test(ancestors)) score += 2;
    if (/logo|brand|wordmark/i.test(attrs($el)) || /logo|brand|wordmark/i.test(ancestors)) score += 2;
    if (/logo/i.test(own) || /logo/i.test(src)) score += 1;
    if (brand && label && label.toLowerCase().includes(brand)) score += 2;
    if (label.length > 60) score -= 4;
    if (NOT_OWN_LOGO.test(ancestors) || NOT_OWN_LOGO.test(attrs($el))) score -= 4;
    if ($el.closest('footer, main article, [role="contentinfo"]').length) score -= 4;
    return score;
}

function imgSrc($el) {
    const placeholder = (v) => !v || /^data:image\/(gif|png|svg\+xml)[;,].{0,300}$/is.test(v); // tiny lazy-load placeholders
    for (const attr of ['src', 'data-src', 'data-lazy-src', 'data-original']) {
        const v = $el.attr(attr)?.trim();
        if (!placeholder(v)) return v;
    }
    const srcset = $el.attr('srcset') ?? $el.attr('data-srcset');
    if (srcset) return srcset.split(',')[0].trim().split(/\s+/)[0];
    return null;
}

/** An inline <svg> as a self-contained data URI, or null when it is too big or obviously not a logo. */
export function svgToDataUri($, el) {
    const $el = $(el).clone();
    if (!$el.attr('xmlns')) $el.attr('xmlns', 'http://www.w3.org/2000/svg');
    const markup = $.html($el);
    if (markup.length > MAX_INLINE_SVG_BYTES || !/<(path|polygon|rect|circle|g|text|use)\b/i.test(markup)) return null;
    if (/<use\b[^>]*href="#/i.test(markup) && !/<symbol|<defs/i.test(markup)) return null; // sprite reference, not self-contained
    return `data:image/svg+xml;base64,${Buffer.from(markup).toString('base64')}`;
}

/**
 * Everything a homepage says about its icons and logos.
 * Returns { title, siteName, themeColor, tileColor, manifestUrl, candidates: [{url, source, rel, sizes, declaredType}] }.
 */
export function extractCandidates(html, pageUrl, { includeHeaderSvg = true } = {}) {
    const $ = cheerio.load(html);
    const base = resolveUrl($('base[href]').attr('href'), pageUrl) ?? pageUrl;
    const candidates = [];
    const add = (url, source, extra = {}) => {
        const resolved = resolveUrl(url, base);
        if (resolved) candidates.push({ url: resolved, source, ...extra });
    };

    let manifestUrl = null;
    $('link[rel][href]').each((_, el) => {
        const rel = ($(el).attr('rel') ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
        const href = $(el).attr('href');
        if (rel === 'manifest') {
            manifestUrl ??= resolveUrl(href, base);
            return;
        }
        const relTokens = rel.split(' ');
        const source = ICON_RELS[rel] ?? (relTokens.includes('icon') ? 'icon' : null)
            ?? (relTokens.some((t) => t.startsWith('apple-touch-icon')) ? 'apple-touch-icon' : null);
        if (!source) return;
        add(href, source, {
            rel,
            sizes: $(el).attr('sizes')?.trim() || null,
            declaredType: $(el).attr('type')?.trim() || null,
            ...(source === 'mask-icon' && $(el).attr('color') ? { color: normalizeColor($(el).attr('color')) } : {}),
        });
    });

    const meta = (names) => {
        for (const n of names) {
            const v = $(`meta[property="${n}"], meta[name="${n}"]`).first().attr('content');
            if (v?.trim()) return v.trim();
        }
        return null;
    };
    const og = meta(['og:image:secure_url', 'og:image', 'og:image:url']);
    if (og) add(og, 'og:image');
    const tw = meta(['twitter:image', 'twitter:image:src']);
    if (tw) add(tw, 'twitter:image');
    const tile = meta(['msapplication-TileImage', 'msapplication-tileimage']);
    if (tile) add(tile, 'msapplication-TileImage');

    $('script[type="application/ld+json"]').each((_, el) => {
        let data;
        try {
            data = JSON.parse($(el).text().trim().replace(/^<!--|-->$/g, ''));
        } catch {
            return;
        }
        for (const logo of jsonLdLogos(data)) add(logo, 'json-ld');
    });
    $('[itemprop="logo"]').each((_, el) => add($(el).attr('src') ?? $(el).attr('content') ?? $(el).attr('href'), 'json-ld'));

    // The site's own logo in the page: <img> or inline <svg> elements scored by logoScore(); the best two are kept.
    const brand = new URL(pageUrl).hostname.replace(/^www\./, '').split('.')[0].toLowerCase();
    const scored = [];
    $('img, picture source').slice(0, 300).each((i, el) => {
        const score = logoScore($, el, pageUrl, brand);
        if (score < 4) return;
        const url = resolveUrl(imgSrc($(el)), base);
        if (url) scored.push({ url, source: 'header-img', alt: $(el).attr('alt')?.trim() || null, score, order: i });
    });
    if (includeHeaderSvg) {
        $('svg').slice(0, 300).each((i, el) => {
            if ($(el).parents('svg').length) return;
            const score = logoScore($, el, pageUrl, brand);
            if (score < 4) return;
            const url = svgToDataUri($, el);
            const alt = $(el).attr('aria-label')?.trim() || $(el).find('title').first().text().trim() || null;
            if (url) scored.push({ url, source: 'header-svg', alt, score, order: 1000 + i });
        });
    }
    scored.sort((a, b) => b.score - a.score || a.order - b.order);
    const unique = scored.filter((c, i) => scored.findIndex((d) => d.url === c.url) === i);
    for (const c of unique.slice(0, 2)) {
        delete c.order;
        candidates.push(c);
    }

    const siteName = meta(['og:site_name', 'application-name', 'apple-mobile-web-app-title']);
    return {
        title: $('title').first().text().replace(/\s+/g, ' ').trim() || null,
        siteName,
        themeColor: normalizeColor($('meta[name="theme-color"]').first().attr('content')),
        tileColor: normalizeColor(meta(['msapplication-TileColor', 'msapplication-tilecolor'])),
        manifestUrl,
        candidates,
    };
}

/** Icons, colors and name from a web app manifest (JSON). */
export function parseManifest(json, manifestUrl) {
    const out = { name: null, themeColor: null, backgroundColor: null, candidates: [] };
    if (!json || typeof json !== 'object') return out;
    out.name = typeof json.name === 'string' ? json.name.trim() : (typeof json.short_name === 'string' ? json.short_name.trim() : null);
    out.themeColor = normalizeColor(json.theme_color);
    out.backgroundColor = normalizeColor(json.background_color);
    for (const icon of Array.isArray(json.icons) ? json.icons.slice(0, 30) : []) {
        const url = resolveUrl(icon?.src, manifestUrl);
        if (!url) continue;
        out.candidates.push({
            url,
            source: 'manifest',
            sizes: typeof icon.sizes === 'string' ? icon.sizes : null,
            declaredType: typeof icon.type === 'string' ? icon.type : null,
            purpose: typeof icon.purpose === 'string' ? icon.purpose : null,
        });
    }
    return out;
}
