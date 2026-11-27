import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FetchError, isFetchableUrl } from '../src/fetch.js';
import { pickBestIcon, pickFavicon } from '../src/pick.js';
import { NothingFoundError, processWebsite } from '../src/site.js';
import { fakeFetch, fixture, html } from './helpers.js';

const opts = { checkImages: true, includeHeaderSvg: true, downloadImages: 'none' };
const target = { input: 'apify.com', url: 'https://apify.com/', hostname: 'apify.com' };

function apifyRoutes() {
    const page = html('apify_com');
    const routes = { 'https://apify.com/': { body: page } };
    // Serve the real icon files for the URLs the page declares.
    for (const m of page.matchAll(/href="(\/icon6\.png[^"]*)"/g)) routes[new URL(m[1].replace(/&amp;/g, '&'), 'https://apify.com/').href] = { body: fixture('apify_icon6.png'), type: 'image/png' };
    for (const m of page.matchAll(/href="(\/favicon\.ico[^"]*)"/g)) routes[new URL(m[1].replace(/&amp;/g, '&'), 'https://apify.com/').href] = { body: fixture('apify_favicon.ico'), type: 'image/x-icon' };
    routes['https://apify.com/favicon.ico'] = { body: fixture('apify_favicon.ico'), type: 'image/x-icon' };
    routes['https://apify.com/img/apify-logo/apify-symbol-200x200.svg'] = { body: fixture('apify_symbol.svg'), type: 'image/svg+xml' };
    return routes;
}

test('processWebsite picks favicon, best icon and logo from checked files', async () => {
    const item = await processWebsite(target, opts, { fetchImpl: fakeFetch(apifyRoutes()) });
    assert.equal(item.domain, 'apify.com');
    assert.match(item.bestIcon, /icon6\.png/);
    assert.equal(item.bestIconSize, '128x128');
    assert.equal(item.bestIconType, 'png');
    assert.match(item.favicon, /favicon\.ico/);
    assert.equal(item.logo, 'https://apify.com/img/apify-logo/apify-symbol-200x200.svg');
    assert.equal(item.logoSource, 'json-ld');
    assert.equal(item.logoType, 'svg');
    assert.equal(item.themeColor, '#020202');
    assert.ok(item.brokenImageLinks > 0); // the other declared icons are 404 in this fake
    assert.ok(item.icons.every((i) => i.type));
    assert.ok(item.icons.find((i) => i.source === 'icon' && /favicon/.test(i.url)).alsoFoundIn === undefined);
});

test('processWebsite saves the chosen files when downloadImages=best', async () => {
    const saved = [];
    const saveImage = async (key, buffer, type) => {
        saved.push({ key, type, size: buffer.length });
        return `https://kvs/${key}`;
    };
    const item = await processWebsite(target, { ...opts, downloadImages: 'best' }, { fetchImpl: fakeFetch(apifyRoutes()), saveImage });
    assert.deepEqual(saved.map((s) => s.key).sort(), ['apify.com-favicon.ico', 'apify.com-icon.png', 'apify.com-logo.svg']);
    assert.equal(item.bestIconDownloadUrl, 'https://kvs/apify.com-icon.png');
    assert.equal(item.logoDownloadUrl, 'https://kvs/apify.com-logo.svg');
});

test('processWebsite without image checks trusts declared sizes', async () => {
    const fetchImpl = fakeFetch({ 'https://apify.com/': { body: html('apify_com') } });
    const item = await processWebsite(target, { ...opts, checkImages: false }, { fetchImpl });
    assert.equal(fetchImpl.calls.length, 1); // homepage only: icons are declared, so no /favicon.ico guess
    assert.equal(item.bestIconSize, '180x180');
    assert.equal(item.imagesChecked, false);
});

test('a page with no icons and a 404 favicon.ico is not charged', async () => {
    const fetchImpl = fakeFetch({ 'https://empty.com/': { body: '<html><head><title>x</title></head><body>hi</body></html>' } });
    await assert.rejects(processWebsite({ input: 'empty.com', url: 'https://empty.com/', hostname: 'empty.com' }, opts, { fetchImpl }), NothingFoundError);
});

test('blocked homepages raise FetchError with the status', async () => {
    const fetchImpl = fakeFetch({ 'https://blocked.com/': { body: 'no', status: 403 } });
    await assert.rejects(processWebsite({ input: 'blocked.com', url: 'https://blocked.com/', hostname: 'blocked.com' }, opts, { fetchImpl }), (err) => err instanceof FetchError && err.statusCode === 403);
});

test('image URLs to private networks are never fetched', () => {
    for (const u of ['http://127.0.0.1/x.png', 'http://169.254.169.254/latest', 'http://10.1.2.3/a', 'http://[::1]/a', 'http://printer.local/a', 'file:///etc/passwd']) assert.equal(isFetchableUrl(u), false, u);
    assert.equal(isFetchableUrl('https://cdn.example.com/a.png'), true);
});

test('pickers: favicon near 32 px, best icon is the largest square raster', () => {
    const c = [
        { source: 'icon', url: 'a16.png', type: 'png', width: 16, height: 16 },
        { source: 'icon', url: 'a32.png', type: 'png', width: 32, height: 32 },
        { source: 'icon', url: 'a.svg', type: 'svg' },
        { source: 'manifest', url: 'm512.png', type: 'png', width: 512, height: 512 },
        { source: 'manifest', url: 'mono.png', type: 'png', width: 1024, height: 1024, purpose: 'monochrome' },
        { source: 'og:image', url: 'og.jpg', type: 'jpg', width: 1200, height: 630 },
    ];
    assert.equal(pickFavicon(c).url, 'a32.png');
    assert.equal(pickBestIcon(c).url, 'm512.png');
    assert.equal(pickBestIcon(c.slice(0, 3)).url, 'a.svg'); // no raster >= 64 px, so the SVG wins
});

test('pickLogo: a tiny JSON-LD logo loses to the header logo and to a bigger icon', async () => {
    const { pickLogo } = await import('../src/pick.js');
    const tiny = { source: 'json-ld', url: 'ld32.png', type: 'png', width: 32, height: 32 };
    const header = { source: 'header-img', url: 'h.png', type: 'png', width: 200, height: 50, score: 7 };
    const icon = { source: 'manifest', url: 'm512.png', type: 'png', width: 512, height: 512 };
    assert.equal(pickLogo([tiny, header, icon], icon).url, 'h.png');
    assert.equal(pickLogo([tiny, icon], icon).url, 'm512.png');
    assert.equal(pickLogo([tiny], null).url, 'ld32.png');
    assert.equal(pickLogo([{ ...tiny, width: 300, height: 100 }, header], icon).url, 'ld32.png');
});
