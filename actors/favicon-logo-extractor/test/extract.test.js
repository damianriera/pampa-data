import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractCandidates, jsonLdLogos, normalizeColor, parseManifest, parseSizes, resolveUrl } from '../src/extract.js';
import { fixture, html } from './helpers.js';

const bySource = (found, source) => found.candidates.filter((c) => c.source === source);

test('apify.com: rel=icon sizes, apple icon, JSON-LD logo, header logo, theme color', () => {
    const found = extractCandidates(html('apify_com'), 'https://apify.com/');
    const icons = bySource(found, 'icon');
    assert.ok(icons.length >= 7);
    assert.ok(icons.some((c) => c.sizes === '128x128' && c.url.startsWith('https://apify.com/icon6.png')));
    assert.ok(icons.some((c) => c.declaredType === 'image/svg+xml'));
    assert.equal(bySource(found, 'apple-touch-icon').length, 1);
    assert.equal(bySource(found, 'json-ld')[0].url, 'https://apify.com/img/apify-logo/apify-symbol-200x200.svg');
    assert.equal(bySource(found, 'header-img')[0].alt, 'Apify logo');
    assert.ok(bySource(found, 'og:image').length === 1);
    assert.equal(found.themeColor, '#020202');
    assert.equal(found.siteName, 'Apify');
});

test('stripe.com: inline SVG logo wins, photos whose alt mentions the logo are skipped', () => {
    const found = extractCandidates(html('stripe_com'), 'https://stripe.com/');
    const inPage = found.candidates.filter((c) => c.source === 'header-svg' || c.source === 'header-img');
    assert.ok(inPage.length >= 1 && inPage.length <= 2);
    assert.equal(inPage[0].source, 'header-svg');
    assert.equal(inPage[0].alt, 'Stripe logo');
    assert.match(inPage[0].url, /^data:image\/svg\+xml;base64,/);
    const svg = Buffer.from(inPage[0].url.split(',')[1], 'base64').toString();
    assert.match(svg, /^<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.ok(!inPage.some((c) => /Aerial view|boutique/.test(c.alt ?? '')));
});

test('wordpress.org: JSON-LD logo and no customer logos from the page body', () => {
    const found = extractCandidates(html('wordpress_org'), 'https://wordpress.org/');
    assert.equal(bySource(found, 'json-ld')[0].url, 'https://s.w.org/style/images/about/WordPress-logotype-wmark.png');
    assert.ok(!found.candidates.some((c) => /rolling-stone|Time-Magazine|Whats-new/i.test(c.url)));
});

test('allbirds.com: Shopify store with an inline SVG logo in the header', () => {
    const found = extractCandidates(html('allbirds_com'), 'https://www.allbirds.com/');
    assert.equal(bySource(found, 'header-svg').length, 1);
    assert.ok(bySource(found, 'icon')[0].url.includes('favicon.png'));
    assert.equal(found.themeColor, '#ece9e2');
});

test('includeHeaderSvg=false skips inline SVG logos', () => {
    const found = extractCandidates(html('stripe_com'), 'https://stripe.com/', { includeHeaderSvg: false });
    assert.equal(bySource(found, 'header-svg').length, 0);
});

test('a small hand-written page covers base href, manifest, mask-icon and microdata', () => {
    const page = `<html><head><base href="https://cdn.example.com/assets/">
      <link rel="SHORTCUT ICON" href="fav.ico"><link rel="mask-icon" href="mask.svg" color="#5BBAD5">
      <link rel="apple-touch-icon-precomposed" sizes="152x152" href="/a.png"><link rel="manifest" href="site.webmanifest">
      <meta name="msapplication-TileColor" content="#DA532C"><meta name="msapplication-TileImage" content="tile.png">
      </head><body><header><a href="/"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="logo.png" alt="Example"></a></header>
      <div itemscope itemtype="https://schema.org/Organization"><img itemprop="logo" src="org-logo.png"></div>
      <footer><a href="/"><img src="footer-logo.png" class="logo"></a></footer></body></html>`;
    const found = extractCandidates(page, 'https://example.com/');
    assert.equal(found.manifestUrl, 'https://cdn.example.com/assets/site.webmanifest');
    assert.equal(bySource(found, 'icon')[0].url, 'https://cdn.example.com/assets/fav.ico');
    assert.equal(bySource(found, 'mask-icon')[0].color, '#5bbad5');
    assert.equal(bySource(found, 'apple-touch-icon')[0].url, 'https://cdn.example.com/a.png');
    assert.equal(bySource(found, 'msapplication-TileImage').length, 1);
    assert.equal(found.tileColor, '#da532c');
    assert.equal(bySource(found, 'json-ld')[0].url, 'https://cdn.example.com/assets/org-logo.png');
    assert.deepEqual(bySource(found, 'header-img').map((c) => c.url), ['https://cdn.example.com/assets/logo.png']);
});

test('parseManifest reads airbnb manifest icons', () => {
    const m = parseManifest(JSON.parse(fixture('airbnb_manifest.json')), 'https://www.airbnb.com/manifest.json');
    assert.equal(m.name, 'Airbnb');
    assert.ok(m.candidates.length >= 2);
    assert.equal(m.candidates[0].sizes, '192x192');
    assert.equal(m.candidates[0].source, 'manifest');
    assert.deepEqual(parseManifest(null, 'https://x.com/m.json').candidates, []);
});

test('small helpers', () => {
    assert.deepEqual(parseSizes('16x16 32X32 any'), [{ width: 16, height: 16 }, { width: 32, height: 32 }, { any: true }]);
    assert.equal(normalizeColor('#FFF'), '#fff');
    assert.equal(normalizeColor('url(x)'), null);
    assert.equal(resolveUrl('javascript:alert(1)', 'https://a.com/'), null);
    assert.equal(resolveUrl('data:text/html,hi', 'https://a.com/'), null);
    assert.deepEqual(jsonLdLogos({ '@graph': [{ '@type': 'Organization', logo: { '@type': 'ImageObject', url: 'l.png' } }, { publisher: { logo: 'p.png' } }] }), ['l.png', 'p.png']);
});
