// One plain GET per website, then the signals the analyzer needs: headers, cookies, HTML, scripts, meta tags, DOM.
import * as cheerio from 'cheerio';
import { Resolver } from 'node:dns/promises';

export const USER_AGENT = 'Mozilla/5.0 (compatible; pampa-data-tech-stack-detector/0.1; +https://apify.com/pampa-data)';
const MAX_BYTES = 3 * 1024 * 1024;

async function readLimited(res) {
    if (!res.body) return '';
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    while (size < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
    }
    reader.cancel().catch(() => {});
    return Buffer.concat(chunks).toString('utf8');
}

export function cookiesFrom(setCookies) {
    const cookies = {};
    for (const line of setCookies) {
        const first = line.split(';')[0];
        const i = first.indexOf('=');
        if (i > 0) cookies[first.slice(0, i).trim()] = first.slice(i + 1).trim();
    }
    return cookies;
}

/** Turns an HTTP response (url, headers, body) into analyzer signals. */
export function extractSignals({ url, headers, setCookies = [], html = '' }) {
    const $ = cheerio.load(html);
    const meta = {};
    $('meta').each((_, el) => {
        const key = ($(el).attr('name') ?? $(el).attr('property') ?? $(el).attr('http-equiv') ?? '').toLowerCase();
        const content = $(el).attr('content');
        if (key && content !== undefined) (meta[key] ??= []).push(content);
    });
    const scriptSrc = $('script[src]').map((_, el) => $(el).attr('src')).get();
    const css = $('style').map((_, el) => $(el).text()).get().join('\n');
    const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 200000);
    const headerMap = {};
    for (const [k, v] of Object.entries(headers)) headerMap[k.toLowerCase()] = Array.isArray(v) ? v : [v];
    const lang = $('html').attr('lang') ?? null;
    return {
        url,
        html,
        text,
        css,
        scriptSrc,
        meta,
        headers: headerMap,
        cookies: cookiesFrom(setCookies),
        $,
        page: {
            title: $('title').first().text().replace(/\s+/g, ' ').trim() || null,
            language: lang ? lang.trim() : null,
        },
    };
}

export class FetchError extends Error {
    constructor(message, statusCode = null) {
        super(message);
        this.statusCode = statusCode;
    }
}

export async function fetchPage(url, { fetchImpl = fetch, timeoutMs = 30000 } = {}) {
    const started = Date.now();
    let res;
    try {
        res = await fetchImpl(url, {
            redirect: 'follow',
            signal: AbortSignal.timeout(timeoutMs),
            headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'accept-language': 'en' },
        });
    } catch (err) {
        throw new FetchError(err.name === 'TimeoutError' ? 'Timed out' : (err.cause?.code ?? err.message));
    }
    const type = res.headers.get('content-type') ?? '';
    const html = /html|xml|text\/plain/i.test(type) || !type ? await readLimited(res) : '';
    if (!html) res.body?.cancel?.().catch(() => {});
    if (res.status >= 400) throw new FetchError(`HTTP ${res.status}`, res.status);
    const headers = {};
    res.headers.forEach((v, k) => { if (k !== 'set-cookie') headers[k] = v; });
    return {
        url: res.url || url,
        statusCode: res.status,
        responseTimeMs: Date.now() - started,
        headers,
        setCookies: res.headers.getSetCookie?.() ?? [],
        html,
    };
}

const DNS_TYPES = { MX: 15, TXT: 16, NS: 2, SOA: 6, CNAME: 5 };

async function nativeDns(hostname, apex, resolver) {
    const safe = (p) => p.catch(() => []);
    const [soa, mx, txt, ns, cname] = await Promise.all([
        resolver.resolveSoa(apex).then((s) => [`${s.nsname} ${s.hostmaster}`]).catch(() => []),
        safe(resolver.resolveMx(apex)).then((r) => r.map((m) => m.exchange)),
        safe(resolver.resolveTxt(apex)).then((r) => r.map((parts) => parts.join(''))),
        safe(resolver.resolveNs(apex)),
        safe(resolver.resolveCname(hostname)),
    ]);
    return { MX: mx, TXT: txt, NS: ns, SOA: soa, CNAME: cname };
}

/** DNS over HTTPS (Cloudflare's public JSON API), used when plain DNS is not reachable from the network. */
export async function dohDns(hostname, apex, { fetchImpl = fetch } = {}) {
    const query = async (name, type) => {
        try {
            const res = await fetchImpl(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
                headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) return [];
            const body = await res.json();
            return (body.Answer ?? []).filter((a) => a.type === DNS_TYPES[type]).map((a) => String(a.data));
        } catch {
            return [];
        }
    };
    const clean = (v) => v.replace(/\.$/, '');
    const [mx, txt, ns, soa, cname] = await Promise.all([
        query(apex, 'MX'), query(apex, 'TXT'), query(apex, 'NS'), query(apex, 'SOA'), query(hostname, 'CNAME'),
    ]);
    return {
        MX: mx.map((d) => clean(d.split(' ').pop())),
        TXT: txt.map((d) => d.replace(/^"|"$/g, '').replace(/" "/g, '')),
        NS: ns.map(clean),
        SOA: soa.map((d) => d.split(' ').slice(0, 2).map(clean).join(' ')),
        CNAME: cname.map(clean),
    };
}

let nativeWorks = null; // learned on the first lookup: some networks block plain DNS

/** MX, TXT, NS, SOA and CNAME records, used by the e-mail, DNS and hosting fingerprints. */
export async function lookupDns(hostname, { resolver = new Resolver({ timeout: 3000, tries: 2 }), fetchImpl = fetch } = {}) {
    const apex = hostname.replace(/^www\./, '');
    if (nativeWorks !== false) {
        const records = await nativeDns(hostname, apex, resolver);
        // Every registered domain has an SOA record; none means plain DNS is blocked here.
        if (records.SOA.length) {
            nativeWorks = true;
            return records;
        }
        if (nativeWorks === true) return records;
        nativeWorks = false;
    }
    return dohDns(hostname, apex, { fetchImpl });
}
