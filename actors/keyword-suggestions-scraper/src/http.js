export class HttpError extends Error {
    constructor(status, url) {
        super(`HTTP ${status} for ${url.split('?')[0]}`);
        this.status = status;
    }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

async function plainGet(url, { timeoutMs }) {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json, text/javascript, */*' }, signal: AbortSignal.timeout(timeoutMs) });
    return { status: res.status, body: res.status === 200 ? await res.text() : '' };
}

async function proxyGet(url, { timeoutMs, proxyUrl }) {
    const { gotScraping } = await import('got-scraping');
    const res = await gotScraping({ url, proxyUrl, timeout: { request: timeoutMs }, throwHttpErrors: false, retry: { limit: 0 } });
    return { status: res.statusCode, body: res.statusCode === 200 ? res.body : '' };
}

/**
 * GET returning the response text. 204 counts as an empty answer.
 * Retries 429, 5xx and network errors with exponential backoff; other 4xx throw right away.
 * `getProxyUrl` is called per attempt so each retry can use a fresh proxy IP.
 */
export async function getText(url, { getProxyUrl, retries = 4, timeoutMs = 20000, getImpl, sleepImpl = sleep } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) await sleepImpl(1000 * 2 ** (attempt - 1));
        let res;
        try {
            const proxyUrl = getProxyUrl ? await getProxyUrl() : undefined;
            const get = getImpl ?? (proxyUrl ? proxyGet : plainGet);
            res = await get(url, { timeoutMs, proxyUrl });
        } catch (err) {
            lastErr = err;
            continue;
        }
        if (res.status === 200) return res.body;
        if (res.status === 204) return '';
        lastErr = new HttpError(res.status, url);
        if (res.status !== 429 && res.status < 500) throw lastErr;
    }
    throw lastErr;
}
