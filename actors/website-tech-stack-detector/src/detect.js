import { analyze, summarize } from './analyze.js';
import { FetchError, extractSignals, fetchPage, lookupDns } from './page.js';

// Parsing and matching are CPU bound. Running them one site at a time keeps the event loop free enough for the
// other sites' downloads; with several at once on a small CPU share, downloads stall and time out.
let cpuQueue = Promise.resolve();
function exclusive(fn) {
    const run = cpuQueue.then(fn, fn);
    cpuQueue = run.catch(() => {});
    return run;
}

const DETAIL_FIELDS = ['website', 'description', 'saas', 'oss', 'pricing', 'cpe'];

/** Fetches one website and returns its dataset item. Throws FetchError when the site cannot be read. */
export async function detectWebsite(target, fingerprints, options, { fetchImpl = fetch, dnsImpl = lookupDns } = {}) {
    let response;
    try {
        response = await fetchPage(target.url, { fetchImpl });
    } catch (err) {
        // HTTP errors and timeouts are final (sites that stall automated requests would double the wait);
        // other network errors get one more try, and a bare domain retries over plain HTTP.
        if (!(err instanceof FetchError) || err.statusCode || err.message === 'Timed out') throw err;
        const retryUrl = target.explicitScheme ? target.url : target.url.replace(/^https:/, 'http:');
        response = await fetchPage(retryUrl, { fetchImpl });
    }
    const finalHost = new URL(response.url).hostname;
    // DNS first: the parsed page is large, so it is built and dropped without awaiting in between.
    const dns = options.includeDns ? await dnsImpl(finalHost) : null;
    return exclusive(() => buildItem(target, response, finalHost, dns, fingerprints, options));
}

async function buildItem(target, response, finalHost, dns, fingerprints, options) {
    const signals = extractSignals(response);
    signals.dns = dns;

    const technologies = (await analyze(signals, fingerprints, { minConfidence: options.minConfidence }))
        .map((t) => {
            if (options.includeDetails) return t;
            const slim = { ...t };
            for (const f of DETAIL_FIELDS) delete slim[f];
            return slim;
        });
    const { title, language } = signals.page;
    signals.$ = null;
    const { summary, byCategory } = summarize(technologies);
    const onPage = technologies.filter((t) => !(t.detectedBy.length === 1 && t.detectedBy[0] === 'dns'));
    return {
        url: target.url,
        input: target.input,
        finalUrl: response.url,
        domain: finalHost,
        statusCode: response.statusCode,
        responseTimeMs: response.responseTimeMs,
        title,
        language,
        technologyCount: onPage.length,
        technologyNames: onPage.map((t) => (t.version ? `${t.name} ${t.version}` : t.name)).join(', '),
        ...summary,
        technologies,
        byCategory,
        checkedAt: new Date().toISOString(),
    };
}
