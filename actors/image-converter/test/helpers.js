import { readFileSync } from 'node:fs';

/** A saved real image (or page) from test/fixtures. */
export function fixture(name) {
    return readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
}

/** A fetch stub: each URL answers with { body, status, headers } or a redirect ({ redirectTo }); others get 404. */
export function fetchStub(byUrl, calls = []) {
    return async (url, init) => {
        calls.push({ url, headers: init?.headers ?? {} });
        const r = byUrl[url];
        if (!r) return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
        if (r.redirectTo) return new Response(null, { status: r.status ?? 302, headers: { location: r.redirectTo } });
        return new Response(r.body, { status: r.status ?? 200, headers: r.headers ?? { 'content-type': 'image/png' } });
    };
}

/** An in-memory store standing in for the key-value store. */
export function memoryStore() {
    const files = new Map();
    return {
        files,
        save: async (key, buffer, contentType) => {
            files.set(key, { buffer, contentType });
            return `https://api.apify.com/v2/key-value-stores/test/records/${key}`;
        },
    };
}
