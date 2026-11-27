// What a downloaded file really is: type, pixel size (largest frame for .ico), and whether it is an image at all.
import { imageSize } from 'image-size';

const MIME = {
    png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon', cur: 'image/x-icon',
    svg: 'image/svg+xml', avif: 'image/avif', heif: 'image/heif', bmp: 'image/bmp', tiff: 'image/tiff', jxl: 'image/jxl',
};
export const EXTENSIONS = { png: 'png', jpg: 'jpg', gif: 'gif', webp: 'webp', ico: 'ico', cur: 'ico', svg: 'svg', avif: 'avif', heif: 'heic', bmp: 'bmp', tiff: 'tif', jxl: 'jxl' };

function looksLikeSvg(buffer) {
    const head = buffer.subarray(0, 2048).toString('utf8').replace(/^﻿/, '').trimStart();
    return /^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head);
}

/** Returns { type, mimeType, width, height } or null when the bytes are not an image (e.g. an HTML 404 page). */
export function describeImage(buffer, { truncated = false } = {}) {
    if (!buffer?.length) return null;
    let info = null;
    try {
        info = imageSize(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
    } catch {
        info = null;
    }
    if (!info && looksLikeSvg(buffer)) info = { type: 'svg' };
    if (!info?.type) {
        // A truncated large file: trust the magic bytes for the type only.
        if (truncated && buffer[0] === 0xff && buffer[1] === 0xd8) return { type: 'jpg', mimeType: MIME.jpg, width: null, height: null };
        return null;
    }
    let { width = null, height = null } = info;
    if (Array.isArray(info.images) && info.images.length) {
        const largest = info.images.reduce((a, b) => ((b.width ?? 0) * (b.height ?? 0) > (a.width ?? 0) * (a.height ?? 0) ? b : a));
        width = largest.width ?? width;
        height = largest.height ?? height;
    }
    const type = info.type === 'jpeg' ? 'jpg' : info.type;
    return {
        type,
        mimeType: MIME[type] ?? `image/${type}`,
        width: Number.isFinite(width) && width > 0 ? Math.round(width) : null,
        height: Number.isFinite(height) && height > 0 ? Math.round(height) : null,
        frames: Array.isArray(info.images) && info.images.length > 1 ? info.images.map((i) => `${i.width}x${i.height}`) : undefined,
    };
}
