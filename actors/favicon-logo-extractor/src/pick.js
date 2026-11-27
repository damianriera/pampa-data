// Chooses the favicon, the best (largest) icon, the SVG icon and the logo from the checked candidates.
import { parseSizes } from './extract.js';

const ICON_SOURCES = new Set(['icon', 'apple-touch-icon', 'manifest', 'favicon.ico', 'msapplication-TileImage']);

/** Pixel size of a candidate: measured when checked, else declared in sizes="". */
export function pixelSize(c) {
    if (c.width && c.height) return { width: c.width, height: c.height };
    const declared = parseSizes(c.sizes).filter((s) => s.width);
    if (!declared.length) return null;
    return declared.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
}

export const isSvg = (c) => c.type === 'svg' || (!c.type && (/svg/i.test(c.declaredType ?? '') || /\.svg(\?|$)/i.test(c.url) || /^data:image\/svg/i.test(c.url)));

function squareish(size) {
    if (!size) return true;
    const r = size.width / size.height;
    return r >= 0.8 && r <= 1.25;
}

const side = (c) => {
    const s = pixelSize(c);
    return s ? Math.min(s.width, s.height) : 0;
};

/** The browser-tab favicon: a rel=icon (or /favicon.ico) closest to 32 px; prefer raster over SVG. */
export function pickFavicon(candidates) {
    const pool = candidates.filter((c) => c.source === 'icon' || c.source === 'favicon.ico');
    if (!pool.length) return null;
    const raster = pool.filter((c) => !isSvg(c));
    if (raster.length) {
        const score = (c) => {
            const s = side(c);
            if (!s) return c.source === 'favicon.ico' || /\.ico(\?|$)/i.test(c.url) ? 1 : 2; // .ico usually holds 16-48 px
            return Math.abs(s - 32) + (s < 32 ? 0.5 : 0);
        };
        return raster.reduce((a, b) => (score(b) < score(a) ? b : a));
    }
    return pool[0];
}

/** The largest square raster icon; an SVG icon wins when no raster icon is at least 64 px. */
export function pickBestIcon(candidates) {
    const pool = candidates.filter((c) => ICON_SOURCES.has(c.source) && squareish(pixelSize(c)) && !/monochrome/i.test(c.purpose ?? ''));
    const raster = pool.filter((c) => !isSvg(c));
    const svg = pool.find(isSvg);
    const largest = raster.length ? raster.reduce((a, b) => (side(b) > side(a) ? b : a)) : null;
    if (largest && side(largest) >= 64) return largest;
    return svg ?? largest ?? null;
}

export function pickSvgIcon(candidates) {
    return candidates.find((c) => (c.source === 'icon' || c.source === 'manifest') && isSvg(c)) ?? null;
}

/** The company logo: JSON-LD logo, then the header logo image or inline SVG, then the best icon. */
export function pickLogo(candidates, bestIcon) {
    const usable = (c) => !(c.width && c.width < 16) && !(c.height && c.height < 12);
    const jsonLd = candidates.filter((c) => c.source === 'json-ld' && usable(c));
    // A JSON-LD logo is the most reliable, unless it is a tiny raster (some sites list their 32 px favicon there).
    const big = jsonLd.find(isSvg) ?? jsonLd.find((c) => !c.width || c.width >= 100);
    if (big) return big;
    const inPage = candidates.filter((c) => (c.source === 'header-img' || c.source === 'header-svg') && usable(c));
    if (inPage.length) {
        // Highest score first; on a tie prefer an SVG (scalable).
        return inPage.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) || ((b.score ?? 0) === (a.score ?? 0) && isSvg(b) && !isSvg(a)) ? b : a));
    }
    if (jsonLd.length && !(bestIcon && side(bestIcon) > (jsonLd[0].width ?? 0))) return jsonLd[0];
    return bestIcon ?? null;
}

export function pickSocialImage(candidates) {
    return candidates.find((c) => c.source === 'og:image') ?? candidates.find((c) => c.source === 'twitter:image') ?? null;
}
