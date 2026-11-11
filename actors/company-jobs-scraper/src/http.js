export class HttpError extends Error {
    constructor(status, url) {
        super(`HTTP ${status} for ${url}`);
        this.status = status;
    }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * JSON request with retries on 429, 5xx and network errors (exponential backoff).
 * Other 4xx answers throw HttpError right away.
 */
export async function fetchJson(url, { method = 'GET', body, retries = 4, timeoutMs = 30000, fetchImpl = fetch, sleepImpl = sleep } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) await sleepImpl(1000 * 2 ** (attempt - 1));
        let res;
        try {
            res = await fetchImpl(url, {
                method,
                headers: {
                    accept: 'application/json',
                    'user-agent': 'pampa-data company-jobs-scraper (+https://apify.com/pampa-data)',
                    ...(body ? { 'content-type': 'application/json' } : {}),
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: AbortSignal.timeout(timeoutMs),
            });
        } catch (err) {
            lastErr = err;
            continue;
        }
        if (res.ok) return res.json();
        lastErr = new HttpError(res.status, url);
        if (res.status !== 429 && res.status < 500) throw lastErr;
    }
    throw lastErr;
}
