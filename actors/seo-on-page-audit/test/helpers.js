import { readFileSync } from 'node:fs';

/** A saved real response from fetchUrl, with its body back as a Buffer. */
export function fixture(name) {
    const saved = JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
    return { ...saved, buffer: Buffer.from(saved.body, 'base64') };
}

/** A fetch stub that answers each URL with a saved response (or 404). Redirect hops are answered as 301s. */
export function fetchFromFixtures(byUrl) {
    return async (url) => {
        const saved = byUrl[url];
        if (!saved) return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
        if (saved.redirectTo) return new Response(null, { status: 301, headers: { location: saved.redirectTo } });
        return new Response(saved.buffer, { status: saved.statusCode, headers: saved.headers });
    };
}
