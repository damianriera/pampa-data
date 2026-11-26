// Converts and resizes one image with sharp (libvips). Pure function of the input buffer and options.
import sharp from 'sharp';

sharp.cache(false);

export const SUPPORTED_INPUTS = ['jpeg', 'png', 'webp', 'avif', 'gif', 'tiff'];
export const CONTENT_TYPES = { webp: 'image/webp', avif: 'image/avif', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', tiff: 'image/tiff' };
export const EXTENSIONS = { webp: 'webp', avif: 'avif', jpeg: 'jpg', png: 'png', gif: 'gif', tiff: 'tif' };

export class ConvertError extends Error {}

/** The AVIF encoder (libaom) needs about 40 MB per output megapixel, on top of about 120 MB for the process. */
export const AVIF_MB_PER_MEGAPIXEL = 40;

export function avifMaxMegapixels(memoryMb) {
    return Math.max(1, (memoryMb * 0.85 - 120) / AVIF_MB_PER_MEGAPIXEL);
}

/** Output width and height sharp will produce for these resize options (used to size the AVIF memory budget). */
export function estimateOutputSize(w0, h0, { width, height, fit, withoutEnlargement }) {
    if (!width && !height) return { width: w0, height: h0 };
    let w;
    let h;
    if (width && height) {
        if (fit === 'inside' || fit === 'outside') {
            const pick = fit === 'inside' ? Math.min : Math.max;
            const scale = pick(width / w0, height / h0);
            [w, h] = [w0 * scale, h0 * scale];
        } else {
            [w, h] = [width, height];
        }
    } else if (width) {
        [w, h] = [width, (h0 * width) / w0];
    } else {
        [w, h] = [(w0 * height) / h0, height];
    }
    if (withoutEnlargement && (w > w0 || h > h0) && !(width && height && fit !== 'inside' && fit !== 'outside')) {
        [w, h] = [w0, h0];
    }
    if (withoutEnlargement) [w, h] = [Math.min(w, w0), Math.min(h, h0)];
    return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) };
}

/** sharp reports AVIF as "heif"; map it back so users see the real type. */
function inputFormatOf(meta, sniffed) {
    if (meta.format === 'heif') return meta.compression === 'av1' ? 'avif' : 'heic';
    return meta.format ?? sniffed;
}

/** The output format for "original": the input's own format. */
export function outputFormatFor(format, inputFormat) {
    return format === 'original' ? inputFormat : format;
}

/**
 * AVIF's quality scale is stricter: sharp's AVIF default 50 looks like JPEG/WebP 80. Map the user's JPEG-like quality
 * so 80 -> 50 and 100 -> 100, otherwise "quality 80" AVIF files come out as large as the original JPEG.
 */
export function avifQuality(q) {
    return Math.max(1, Math.round(q <= 80 ? (q * 50) / 80 : 50 + (q - 80) * 2.5));
}

function encode(pipeline, outFormat, opts) {
    const { quality, lossless } = opts;
    switch (outFormat) {
        case 'webp': return pipeline.webp({ quality, lossless, effort: 4 });
        case 'avif': return pipeline.avif({ quality: avifQuality(quality), lossless, effort: 3 }) // effort 3: ~3% larger than 4, about 4x faster;
        case 'jpeg': return pipeline.jpeg({ quality, mozjpeg: true });
        case 'png': return lossless || quality >= 100
            ? pipeline.png({ compressionLevel: 9 })
            : pipeline.png({ compressionLevel: 9, palette: true, quality });
        case 'gif': return pipeline.gif();
        case 'tiff': return pipeline.tiff({ quality, compression: lossless ? 'lzw' : 'jpeg' });
        default: throw new ConvertError(`Unsupported output format: ${outFormat}`);
    }
}

/**
 * Returns { buffer, input: {...}, output: {...} }. Throws ConvertError for unsupported or broken images.
 * opts: format, width, height, fit, withoutEnlargement, quality, lossless, keepMetadata, keepAnimation, background,
 * maxMegapixels, sniffed (type from the first bytes), memoryMb (the run's memory, for the AVIF budget).
 */
export async function convertImage(source, opts) {
    const limitInputPixels = opts.maxMegapixels * 1_000_000;
    let meta;
    try {
        meta = await sharp(source, { limitInputPixels: false }).metadata(); // header only; the size check is ours
    } catch (err) {
        throw new ConvertError(`Could not read the image: ${err.message}`);
    }
    const inputFormat = inputFormatOf(meta, opts.sniffed);
    if (!SUPPORTED_INPUTS.includes(inputFormat)) {
        throw new ConvertError(`Unsupported image type: ${inputFormat} (supported: JPEG, PNG, WebP, AVIF, GIF, TIFF)`);
    }
    const megapixels = (meta.width * (meta.pageHeight ?? meta.height)) / 1_000_000;
    if (megapixels > opts.maxMegapixels) {
        throw new ConvertError(`Image is ${megapixels.toFixed(1)} megapixels, over the ${opts.maxMegapixels} MP limit (raise maxMegapixels to convert it)`);
    }
    const frames = meta.pages ?? 1;
    const outFormat = outputFormatFor(opts.format, inputFormat);
    // All frames are decoded at once, so an animation must fit the pixel cap as a whole; otherwise we keep frame 1.
    const animated = frames > 1 && opts.keepAnimation && ['webp', 'gif'].includes(outFormat)
        && megapixels * frames <= opts.maxMegapixels;

    if (outFormat === 'avif') {
        const swap = meta.orientation >= 5;
        const w0 = swap ? meta.height : meta.width;
        const h0 = swap ? meta.width : meta.height;
        const out = estimateOutputSize(w0, h0, opts);
        const outMp = (out.width * out.height) / 1_000_000;
        const maxMp = avifMaxMegapixels(opts.memoryMb ?? 512);
        if (outMp > maxMp) {
            throw new ConvertError(`AVIF output of ${out.width}x${out.height} (${outMp.toFixed(1)} MP) needs about `
                + `${Math.round(outMp * AVIF_MB_PER_MEGAPIXEL + 150)} MB memory; this run allows about ${maxMp.toFixed(1)} MP. `
                + 'Set a smaller width/height, choose WebP, or give the run more memory');
        }
    }

    let pipeline = sharp(source, { limitInputPixels, animated, failOn: 'error' });
    if (!animated) pipeline = pipeline.rotate(); // apply the EXIF orientation, then drop it
    if (opts.width || opts.height) {
        pipeline = pipeline.resize({
            width: opts.width ?? undefined,
            height: opts.height ?? undefined,
            fit: opts.fit,
            withoutEnlargement: opts.withoutEnlargement,
            background: opts.fit === 'contain' && !['jpeg'].includes(outFormat) ? { r: 0, g: 0, b: 0, alpha: 0 } : opts.background,
        });
    }
    if (outFormat === 'jpeg' && meta.hasAlpha) pipeline = pipeline.flatten({ background: opts.background });
    if (opts.keepMetadata) pipeline = pipeline.keepMetadata();
    pipeline = encode(pipeline, outFormat, opts);

    let buffer;
    let info;
    try {
        ({ data: buffer, info } = await pipeline.toBuffer({ resolveWithObject: true }));
    } catch (err) {
        throw new ConvertError(`Could not convert the image: ${err.message}`);
    }
    const orientedSwap = !animated && meta.orientation >= 5;
    return {
        buffer,
        input: {
            format: inputFormat,
            width: orientedSwap ? (meta.pageHeight ?? meta.height) : meta.width,
            height: orientedSwap ? meta.width : (meta.pageHeight ?? meta.height),
            frames,
            hasAlpha: Boolean(meta.hasAlpha),
            hasExif: Boolean(meta.exif),
            colorSpace: meta.space ?? null,
        },
        output: {
            format: outFormat,
            contentType: CONTENT_TYPES[outFormat],
            extension: EXTENSIONS[outFormat],
            width: info.width,
            height: info.pageHeight ?? info.height,
            frames: animated ? frames : 1,
            bytes: buffer.length,
        },
    };
}
