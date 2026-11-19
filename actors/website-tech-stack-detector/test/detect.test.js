import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../src/analyze.js';
import { detectWebsite } from '../src/detect.js';
import { loadFingerprints } from '../src/fingerprints.js';
import { extractSignals } from '../src/page.js';
import { fetchFromFixture, fixture } from './helpers.js';

const fp = loadFingerprints();
const opts = { includeDns: false, includeDetails: false, minConfidence: 0 };
const target = (url) => ({ input: url, url, hostname: new URL(url).hostname, explicitScheme: true });
const names = (item) => item.technologies.map((t) => t.name);

test('wordpress.org: WordPress with version, implied PHP and MySQL', async () => {
    const item = await detectWebsite(target('https://wordpress.org/'), fp, opts, { fetchImpl: fetchFromFixture(fixture('wordpress_org.json')) });
    const wp = item.technologies.find((t) => t.name === 'WordPress');
    assert.ok(wp, names(item).join(', '));
    assert.match(wp.version, /^\d+\.\d+/);
    assert.deepEqual(item.cms, ['WordPress']);
    assert.ok(item.webServers.includes('Nginx'));
    const php = item.technologies.find((t) => t.name === 'PHP');
    assert.equal(php.impliedBy, 'WordPress');
    assert.deepEqual(php.detectedBy, ['implied']);
    assert.equal(item.statusCode, 200);
    assert.ok(item.title);
    assert.equal(item.website, undefined);
    assert.equal(wp.description, undefined, 'details are off by default');
});

test('allbirds.com: Shopify store on Cloudflare with payments', async () => {
    const item = await detectWebsite(target('https://www.allbirds.com/'), fp, { ...opts, includeDetails: true }, { fetchImpl: fetchFromFixture(fixture('allbirds_com.json')) });
    assert.ok(item.ecommerce.includes('Shopify'), names(item).join(', '));
    assert.ok(item.cdn.includes('Cloudflare'));
    assert.ok(item.paymentProcessors.length > 0);
    const shopify = item.technologies.find((t) => t.name === 'Shopify');
    assert.equal(shopify.website, 'https://shopify.com');
    assert.ok(shopify.description);
    assert.ok(item.byCategory.Ecommerce.includes('Shopify'));
    assert.ok(item.technologyNames.includes('Shopify'));
});

test('nextjs.org: React, Vercel', async () => {
    const item = await detectWebsite(target('https://nextjs.org/'), fp, opts, { fetchImpl: fetchFromFixture(fixture('nextjs_org.json')) });
    assert.ok(item.javascriptFrameworks.includes('React'), names(item).join(', '));
    assert.ok(names(item).includes('Next.js'), 'found from /_next/static/ scripts');
    assert.ok(item.hosting.includes('Vercel') || names(item).includes('Vercel'));
});

test('DNS records reveal e-mail and company tools', async () => {
    const dns = fixture('dns_stripe_com.json');
    const item = await detectWebsite(target('https://wordpress.org/'), fp, { ...opts, includeDns: true }, {
        fetchImpl: fetchFromFixture(fixture('wordpress_org.json')),
        dnsImpl: async () => dns,
    });
    assert.ok(item.email.includes('Google Workspace'), item.email.join(', '));
    assert.ok(item.companyTools.includes('Salesforce'));
    assert.ok(!item.companyTools.includes('WordPress'));
    assert.ok(!item.technologyNames.includes('Salesforce'), 'DNS-only tools stay out of technologyNames');
    assert.ok(item.technologies.some((t) => t.name === 'Salesforce'));
});

test('excludes, requires and cookie wildcards', async () => {
    const signals = extractSignals({
        url: 'https://shop.example/',
        headers: { server: 'nginx/1.25.3' },
        setCookies: ['_ga_ABC123=GS1.1; Path=/', '_ga=GA1.2; Path=/'],
        html: '<html><head><meta name="generator" content="WordPress 6.4.2"></head><body></body></html>',
    });
    const found = await analyze(signals, fp);
    const ga = found.find((t) => t.name === 'Google Analytics');
    assert.equal(ga.version, 'GA4');
    assert.equal(found.find((t) => t.name === 'Nginx').version, '1.25.3');
    assert.equal(found.find((t) => t.name === 'WordPress').version, '6.4.2');
    // A WordPress plugin fingerprint must not fire without WordPress.
    const noWp = await analyze(extractSignals({ url: 'https://x.example/', headers: {}, html: '<script src="/wp-content/plugins/woocommerce/assets/js/frontend/woocommerce.min.js"></script>' }), fp);
    assert.ok(noWp.some((t) => t.name === 'WooCommerce'));
    assert.ok(noWp.some((t) => t.name === 'WordPress'), 'wp-content path itself reveals WordPress');
});

test('HTTP errors are thrown so the site is not charged', async () => {
    const fetchImpl = fetchFromFixture({ url: 'https://blocked.example/', statusCode: 403, headers: { 'content-type': 'text/html' }, html: 'denied' });
    await assert.rejects(detectWebsite(target('https://blocked.example/'), fp, opts, { fetchImpl }), /HTTP 403/);
});

test('bare domains fall back to plain HTTP when HTTPS fails', async () => {
    const seen = [];
    const ok = fetchFromFixture({ url: 'http://old.example/', statusCode: 200, headers: { 'content-type': 'text/html' }, html: '<title>Old</title>' });
    const fetchImpl = async (url, o) => {
        seen.push(url);
        if (url.startsWith('https:')) throw Object.assign(new Error('fail'), { cause: { code: 'ECONNREFUSED' } });
        return ok(url, o);
    };
    const item = await detectWebsite({ input: 'old.example', url: 'https://old.example/', hostname: 'old.example', explicitScheme: false }, fp, opts, { fetchImpl });
    assert.deepEqual(seen, ['https://old.example/', 'http://old.example/']);
    assert.equal(item.title, 'Old');
});

test('full URLs get one retry on a network error, not on HTTP errors', async () => {
    let calls = 0;
    const ok = fetchFromFixture({ url: 'https://flaky.example/', statusCode: 200, headers: { 'content-type': 'text/html' }, html: '<title>Flaky</title>' });
    const fetchImpl = async (url, o) => {
        calls++;
        if (calls === 1) throw Object.assign(new Error('fail'), { cause: { code: 'ECONNRESET' } });
        return ok(url, o);
    };
    const item = await detectWebsite(target('https://flaky.example/'), fp, opts, { fetchImpl });
    assert.equal(calls, 2);
    assert.equal(item.title, 'Flaky');
});

test('timeouts are not retried', async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; throw Object.assign(new Error('slow'), { name: 'TimeoutError' }); };
    await assert.rejects(detectWebsite(target('https://slow.example/'), fp, opts, { fetchImpl }), /Timed out/);
    assert.equal(calls, 1);
});
