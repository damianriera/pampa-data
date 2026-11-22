import { readFileSync } from 'node:fs';

export const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

/** A fetch stub that answers with a saved real response. */
export function fetchFromFixture(saved) {
    return async () => {
        const headers = new Headers(saved.headers);
        for (const c of saved.setCookies ?? []) headers.append('set-cookie', c);
        const res = new Response(saved.html, { status: saved.statusCode, headers });
        Object.defineProperty(res, 'url', { value: saved.url });
        return res;
    };
}
