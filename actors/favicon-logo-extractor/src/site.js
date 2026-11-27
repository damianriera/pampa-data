// One website: homepage -> candidates (+ manifest + /favicon.ico) -> check each image -> pick favicon, icon, logo.
import { extractCandidates, parseManifest } from './extract.js';
import { fetchImage, fetchPage, readLimited, USER_AGENT } from './fetch.js';
import { describeImage, EXTENSIONS } from './image.js';
import { isSvg, pickBestIcon, pickFavicon, pickLogo, pickSocialImage, pickSvgIcon, pixelSize } from './pick.js';

export const MAX_CANDIDATES = 20;
const IMAGE_CONCURRENCY = 4;

export class NothingFoundError extends Error {}

async function fetchManifest(url, fetchImpl) {
    try {
        const res = await fetchImpl(url, {
            redirect: 'follow',
            signal: AbortSignal.timeout(10000),
            headers: { 'user-agent': USER_AGENT, accept: 'application/manifest+json,application/json,*/*;q=0.5' },
        });
        if (!res.ok) {
            res.body?.cancel?.().catch(() => {});
            return null;
        }
        const { buffer } = await readLimited(res, 256 * 1024);
        return JSON.parse(buffer.toString('utf8').replace(/^﻿/, ''));
    } catch {
        return null;
    }
}

/** Merges candidates that point to the same file; the first (most specific) source wins, the others are listed. */
export function dedupe(candidates) {
    const byUrl = new Map();
    for (const c of candidates) {
        const prev = byUrl.get(c.url);
        if (!prev) {
            byUrl.set(c.url, { ...c, sources: [c.source] });
            continue;
        }
        if (!prev.sources.includes(c.source)) prev.sources.push(c.source);
        for (const k of ['sizes', 'declaredType', 'purpose', 'alt', 'color', 'rel']) prev[k] ??= c[k];
    }
    return [...byUrl.values()];
}

async function mapLimit(items, limit, fn) {
    const queue = items.map((item, i) => [item, i]);
    const out = new Array(items.length);
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (queue.length) {
            const [item, i] = queue.shift();
            out[i] = await fn(item);
        }
    }));
    return out;
}

async function checkCandidate(c, { fetchImpl, keepBytes, referer }) {
    const res = await fetchImage(c.url, { fetchImpl, referer });
    if (!res.ok) return { ...c, ok: false, error: res.error };
    const info = describeImage(res.buffer, { truncated: res.truncated });
    if (!info) return { ...c, ok: false, error: `Not an image (${res.contentType || 'unknown type'})` };
    return {
        ...c,
        ok: true,
        finalUrl: res.finalUrl !== c.url ? res.finalUrl : undefined,
        ...info,
        bytes: res.bytes ?? null,
        buffer: keepBytes && !res.truncated ? res.buffer : undefined,
    };
}

/** The public shape of one image in the dataset. */
export function imageView(c) {
    if (!c) return null;
    const size = pixelSize(c);
    const out = {
        url: c.url,
        source: c.source,
        type: c.type ?? null,
        width: size?.width ?? null,
        height: size?.height ?? null,
        sizes: c.sizes ?? null,
        bytes: c.bytes ?? null,
    };
    if (c.sources?.length > 1) out.alsoFoundIn = c.sources.slice(1);
    if (c.finalUrl) out.finalUrl = c.finalUrl;
    if (c.frames) out.frames = c.frames;
    if (c.purpose) out.purpose = c.purpose;
    if (c.alt) out.alt = c.alt;
    if (c.color) out.color = c.color;
    if (!c.type && c.declaredType) out.declaredType = c.declaredType;
    return out;
}

/**
 * @param target {url, hostname, input}
 * @param opts {checkImages, includeHeaderSvg, downloadImages}
 * @param deps {fetchImpl, saveImage(key, buffer, mimeType) -> publicUrl}
 */
export async function processWebsite(target, opts, { fetchImpl = fetch, saveImage } = {}) {
    const page = await fetchPage(target.url, { fetchImpl });
    const found = extractCandidates(page.html, page.url, { includeHeaderSvg: opts.includeHeaderSvg });

    let manifest = { name: null, themeColor: null, backgroundColor: null, candidates: [] };
    if (found.manifestUrl) manifest = parseManifest(await fetchManifest(found.manifestUrl, fetchImpl), found.manifestUrl);

    let candidates = [...found.candidates, ...manifest.candidates];
    const declaresIcon = candidates.some((c) => c.source === 'icon');
    candidates.push({ url: new URL('/favicon.ico', page.url).href, source: 'favicon.ico' });
    candidates = dedupe(candidates).slice(0, MAX_CANDIDATES);

    const keepBytes = opts.downloadImages !== 'none';
    let checked;
    let broken = 0;
    if (opts.checkImages) {
        const results = await mapLimit(candidates, IMAGE_CONCURRENCY, (c) => checkCandidate(c, { fetchImpl, keepBytes, referer: page.url }));
        checked = results.filter((r) => r.ok);
        broken = results.length - checked.length;
    } else {
        // Without checking, the /favicon.ico guess is only kept when the page declares no icon and the file exists.
        checked = [];
        for (const c of candidates) {
            if (c.source === 'favicon.ico' && c.sources.length === 1) {
                if (declaresIcon) continue;
                const r = await checkCandidate(c, { fetchImpl, keepBytes, referer: page.url });
                if (r.ok) checked.push(r);
                else broken++;
            } else checked.push(c);
        }
    }

    const favicon = pickFavicon(checked);
    const bestIcon = pickBestIcon(checked);
    const logo = pickLogo(checked, bestIcon);
    if (!favicon && !bestIcon && !logo) {
        throw new NothingFoundError(broken ? `No working favicon or logo (${broken} broken image link(s))` : 'No favicon or logo found');
    }
    const svgIcon = pickSvgIcon(checked);
    const apple = checked.filter((c) => c.source === 'apple-touch-icon').reduce((a, b) => (!a || (pixelSize(b)?.width ?? 0) > (pixelSize(a)?.width ?? 0) ? b : a), null);
    const social = pickSocialImage(checked);

    const icons = checked.filter((c) => !['og:image', 'twitter:image', 'json-ld', 'header-img', 'header-svg'].includes(c.source));
    const logos = checked.filter((c) => ['json-ld', 'header-img', 'header-svg'].includes(c.source));

    const item = {
        input: target.input,
        domain: target.hostname.replace(/^www\./, ''),
        url: page.url,
        title: found.title,
        siteName: found.siteName ?? manifest.name ?? null,
        favicon: favicon?.url ?? null,
        faviconType: favicon?.type ?? null,
        bestIcon: bestIcon?.url ?? null,
        bestIconSize: (() => { const s = pixelSize(bestIcon ?? {}); return s ? `${s.width}x${s.height}` : (bestIcon && isSvg(bestIcon) ? 'scalable' : null); })(),
        bestIconType: bestIcon?.type ?? null,
        svgIcon: svgIcon?.url ?? null,
        appleTouchIcon: apple?.url ?? null,
        logo: logo?.url ?? null,
        logoSource: logo ? (logo === bestIcon ? 'icon' : logo.source) : null,
        logoType: logo?.type ?? null,
        logoWidth: pixelSize(logo ?? {})?.width ?? null,
        logoHeight: pixelSize(logo ?? {})?.height ?? null,
        ogImage: social?.url ?? null,
        themeColor: found.themeColor ?? manifest.themeColor ?? null,
        backgroundColor: manifest.backgroundColor ?? null,
        tileColor: found.tileColor ?? null,
        maskIconColor: checked.find((c) => c.source === 'mask-icon')?.color ?? null,
        manifestUrl: found.manifestUrl,
        iconCount: icons.length,
        icons: icons.map(imageView),
        logos: logos.map(imageView),
        socialImages: checked.filter((c) => c.source === 'og:image' || c.source === 'twitter:image').map(imageView),
        brokenImageLinks: broken,
        imagesChecked: Boolean(opts.checkImages),
    };

    if (keepBytes && saveImage) {
        const picks = opts.downloadImages === 'all'
            ? checked.map((c, i) => [c, c === bestIcon ? 'icon' : c === logo ? 'logo' : c === favicon ? 'favicon' : `${c.source.replace(/[^a-z0-9]+/gi, '-')}-${i + 1}`])
            : [[bestIcon, 'icon'], [logo !== bestIcon ? logo : null, 'logo'], [favicon !== bestIcon ? favicon : null, 'favicon']];
        item.downloads = [];
        for (const [c, label] of picks) {
            if (!c?.buffer || !c.type) continue;
            const key = `${item.domain}-${label}.${EXTENSIONS[c.type] ?? c.type}`.replace(/[^a-zA-Z0-9!\-_.'()]/g, '-').slice(0, 250);
            const link = await saveImage(key, c.buffer, c.mimeType);
            item.downloads.push({ label, key, url: link, sourceUrl: c.url.startsWith('data:') ? 'inline SVG' : c.url });
            if (label === 'icon') item.bestIconDownloadUrl = link;
            if (label === 'logo') item.logoDownloadUrl = link;
        }
        if (logo && logo === bestIcon) item.logoDownloadUrl = item.bestIconDownloadUrl ?? null;
        for (const c of checked) delete c.buffer;
    }
    return item;
}
