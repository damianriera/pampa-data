import { readFileSync } from 'node:fs';

/** A saved real PDF from test/fixtures. */
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
        return new Response(r.body, { status: r.status ?? 200, headers: r.headers ?? { 'content-type': 'application/pdf' } });
    };
}
