import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const dir = new URL('./fixtures/', import.meta.url);
export const fixture = (name) => readFileSync(new URL(name, dir));
export const html = (name) => gunzipSync(fixture(`${name}.html.gz`)).toString('utf8');

/** A fake fetch serving fixtures by URL. Unknown URLs answer 404. */
export function fakeFetch(routes) {
    const calls = [];
    const impl = async (url) => {
        calls.push(url);
        const route = routes[url];
        if (!route) return new Response('<html>not found</html>', { status: 404, headers: { 'content-type': 'text/html' } });
        const { body, type = 'text/html', status = 200 } = route;
        const res = new Response(body, { status, headers: { 'content-type': type } });
        Object.defineProperty(res, 'url', { value: url });
        return res;
    };
    impl.calls = calls;
    return impl;
}
