// Turns pdf.js text items into lines, plain text and simple Markdown (headings from font size).

/** Font size of a pdf.js item (from its transform matrix) and whether it is rotated (margin stamps, axis labels). */
function geometry(item) {
    const t = item.transform;
    if (!t) return { size: item.fontSize ?? 0, rotated: false, x: null, y: null, width: 0 };
    return { size: Math.hypot(t[2], t[3]), rotated: Math.abs(t[1]) > 0.01 || Math.abs(t[2]) > 0.01, x: t[4], y: t[5], width: item.width ?? 0 };
}

/**
 * pdf.js items of one page -> [{ text, size, rotated }]. A line ends where pdf.js marks an end of line.
 * pdf.js does not always emit the space between two runs of text, so one is added when there is a visible gap.
 */
export function buildLines(items) {
    const lines = [];
    let text = '';
    let size = 0;
    let rotated = false;
    let prevEnd = null;
    let prevY = null;
    const flush = () => {
        lines.push({ text: text.replace(/[^\S\n]+/g, ' ').trim(), size: Math.round(size * 10) / 10, rotated });
        text = '';
        size = 0;
        rotated = false;
        prevEnd = null;
        prevY = null;
    };
    for (const item of items) {
        if (item.str == null) continue;
        const g = geometry(item);
        const gap = prevEnd != null && g.x != null && !g.rotated
            && (g.x - prevEnd > g.size * 0.15 || Math.abs(g.y - prevY) > g.size * 0.5);
        if (item.str && gap && /\S$/.test(text) && /^\S/.test(item.str)) text += ' ';
        text += item.str;
        if (item.str.trim()) {
            if (g.size > size) size = g.size;
            if (g.rotated) rotated = true;
        }
        if (item.str && g.x != null) {
            prevEnd = g.x + g.width;
            prevY = g.y;
        }
        if (item.hasEOL) flush();
    }
    if (text) flush();
    return lines;
}

/** Lines -> text with at most one blank line in a row. */
export function linesToText(lines) {
    return lines.map((l) => l.text).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** The font size most characters use: the body text size. */
export function bodySize(pages) {
    const weight = new Map();
    for (const lines of pages) {
        for (const l of lines) if (l.text && l.size && !l.rotated) weight.set(l.size, (weight.get(l.size) ?? 0) + l.text.length);
    }
    let best = 0;
    let bestWeight = -1;
    for (const [size, w] of weight) if (w > bestWeight) [best, bestWeight] = [size, w];
    return best;
}

const isHeadingText = (t) => t.length > 0 && t.length <= 150 && /\p{L}/u.test(t) && !/[,;:]$/.test(t);

/**
 * Pages of lines -> Markdown. Short, horizontal lines set at least 15% larger than the body text become headings:
 * 1.6 times the body size or more is #, 1.3 times is ##, smaller ones ###. Consecutive heading lines of the same
 * size are merged. Pages are separated by an HTML comment so they can be split again.
 */
export function pagesToMarkdown(pages, pageNumbers) {
    const body = bodySize(pages);
    const isHeading = (l) => body > 0 && !l.rotated && l.size >= body * 1.15 && isHeadingText(l.text);
    const level = (size) => (size >= body * 1.6 ? 1 : size >= body * 1.3 ? 2 : 3);
    const out = [];
    pages.forEach((lines, i) => {
        if (pages.length > 1) out.push(`<!-- page ${pageNumbers[i]} -->`);
        let para = [];
        let heading = null;
        const endPara = () => {
            if (para.length) out.push(para.join('\n'));
            para = [];
        };
        const endHeading = () => {
            if (heading) out.push(`${'#'.repeat(level(heading.size))} ${heading.text}`);
            heading = null;
        };
        for (const l of lines) {
            if (!l.text) {
                endHeading();
                endPara();
                continue;
            }
            if (isHeading(l)) {
                endPara();
                if (heading && heading.size === l.size) heading.text += ` ${l.text}`;
                else {
                    endHeading();
                    heading = { size: l.size, text: l.text };
                }
                continue;
            }
            endHeading();
            para.push(l.text);
        }
        endHeading();
        endPara();
    });
    return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function countWords(text) {
    if (!text) return 0;
    const m = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu);
    return m ? m.length : 0;
}

/** Cut at a word boundary after max characters. */
export function truncate(text, max) {
    if (!max || text.length <= max) return { text, truncated: false };
    const cut = text.slice(0, max);
    const space = cut.search(/\s\S*$/);
    return { text: (space > max * 0.8 ? cut.slice(0, space) : cut).trimEnd(), truncated: true };
}
