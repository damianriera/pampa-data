// One URL -> { row } (a dataset item, charged) or { failure } (FAILED record, not charged).
import { ConvertError, convertImage } from './convert.js';
import { downloadImage } from './fetch.js';

/**
 * deps.save(key, buffer, contentType) stores the file and returns its public URL.
 * deps.namer gives the key; deps.limiter limits downloads per host; deps.cpuLimiter limits parallel conversions (memory).
 */
export async function processUrl(url, input, { fetchImpl, limiter, cpuLimiter, token, save, namer } = {}) {
    let file;
    try {
        const download = () => downloadImage(url, { fetchImpl, token, maxBytes: input.maxFileSizeMb * 1048576 });
        file = limiter ? await limiter.run(new URL(url).host, download) : await download();
    } catch (err) {
        return { failure: { url, statusCode: err.statusCode ?? null, error: err.message } };
    }
    if (file.type === 'svg' || file.type === 'heic') {
        const name = file.type === 'svg' ? 'SVG' : 'HEIC';
        return { failure: { url, finalUrl: file.url, error: `Unsupported image type: ${name} (supported: JPEG, PNG, WebP, AVIF, GIF, TIFF)` } };
    }
    let result;
    try {
        const convert = () => convertImage(file.buffer, { ...input, sniffed: file.type });
        result = cpuLimiter ? await cpuLimiter.run('convert', convert) : await convert();
    } catch (err) {
        const error = err instanceof ConvertError ? err.message : `Could not convert the image: ${err.message}`;
        return { failure: { url, finalUrl: file.url, error } };
    }
    const inputBytes = file.buffer.length;
    file.buffer = null;
    const key = namer.next(file.fileName, result.output.extension);
    let outputUrl;
    try {
        outputUrl = await save(key, result.buffer, result.output.contentType);
    } catch (err) {
        return { failure: { url, finalUrl: file.url, error: `Could not save the converted image: ${err.message}` } };
    }
    const savedBytes = inputBytes - result.output.bytes;
    return {
        row: {
            url,
            finalUrl: file.url,
            fileName: file.fileName,
            outputUrl,
            key,
            inputFormat: result.input.format,
            inputWidth: result.input.width,
            inputHeight: result.input.height,
            inputBytes,
            outputFormat: result.output.format,
            outputWidth: result.output.width,
            outputHeight: result.output.height,
            outputBytes: result.output.bytes,
            savedBytes,
            savedPercent: inputBytes ? Math.round((savedBytes / inputBytes) * 1000) / 10 : 0,
            contentType: result.output.contentType,
            frames: result.input.frames,
            outputFrames: result.output.frames,
            hasAlpha: result.input.hasAlpha,
            metadataKept: input.keepMetadata,
            processedAt: new Date().toISOString(),
        },
    };
}
