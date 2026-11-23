import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { collectSitemapUrls, parseSitemap } from '../src/sitemap.js';
import { bodyText } from '../src/fetch.js';
import { fetchFromFixtures, fixture } from './helpers.js';

test('parses a real sitemap index and urlset (wordpress.org)', () => {
    const index = parseSitemap(bodyText(fixture('sitemap_wordpress_org')));
    assert.equal(index.type, 'index');
    assert.ok(index.locs.includes('https://wordpress.org/sitemap-1.xml'));
    const urlset = parseSitemap(bodyText(fixture('sitemap1_wordpress_org')));
    assert.equal(urlset.type, 'urlset');
    assert.ok(urlset.locs.length > 10);
    assert.ok(urlset.locs.every((u) => u.startsWith('https://wordpress.org/')));
});

test('text sitemaps, CDATA and entities', () => {
    assert.deepEqual(parseSitemap('https://a.com/1\nhttps://a.com/2\n').locs, ['https://a.com/1', 'https://a.com/2']);
    const xml = '<urlset><url><loc><![CDATA[https://a.com/?a=1&b=2]]></loc></url><url><loc>https://a.com/?x=1&amp;y=2</loc></url></urlset>';
    assert.deepEqual(parseSitemap(xml).locs, ['https://a.com/?a=1&b=2', 'https://a.com/?x=1&y=2']);
    assert.equal(parseSitemap('<html></html>').type, 'unknown');
});

test('discovers sitemaps from robots.txt, follows the index, applies filter and limit', async () => {
    const urlset = fixture('sitemap1_wordpress_org');
    const fetchImpl = fetchFromFixtures({
        'https://wordpress.org/sitemap.xml': fixture('sitemap_wordpress_org'),
        'https://wordpress.org/sitemap-1.xml': urlset,
        'https://wordpress.org/image-sitemap-1.xml': { statusCode: 200, headers: { 'content-type': 'application/x-gzip' },
            buffer: gzipSync('<urlset><url><loc>https://wordpress.org/download/</loc></url><url><loc>https://wordpress.org/zzz-image/</loc></url></urlset>') },
    });
    const getRobots = async () => ({ text: 'User-agent: *\nDisallow:\nSitemap: https://wordpress.org/sitemap.xml\n' });
    const all = await collectSitemapUrls(['https://wordpress.org'], { limit: 10000, getRobots, fetchImpl });
    assert.ok(all.urls.includes('https://wordpress.org/zzz-image/'));
    assert.equal(new Set(all.urls).size, all.urls.length);
    // video sitemap is not in the fixtures: reported, not fatal
    assert.equal(all.errors.length, 1);
    assert.match(all.errors[0].error, /HTTP 404/);

    const some = await collectSitemapUrls(['https://wordpress.org/'], { limit: 3, getRobots, fetchImpl });
    assert.equal(some.urls.length, 3);
    const filtered = await collectSitemapUrls(['https://wordpress.org/sitemap.xml'], { limit: 100, getRobots, fetchImpl, filter: /zzz/ });
    assert.deepEqual(filtered.urls, ['https://wordpress.org/zzz-image/']);
});

test('falls back to /sitemap.xml when robots.txt lists none', async () => {
    const asked = [];
    const fetchImpl = async (url) => { asked.push(url); return new Response('<urlset><url><loc>https://a.com/x</loc></url></urlset>', { status: 200 }); };
    const res = await collectSitemapUrls(['https://a.com'], { limit: 10, getRobots: async () => null, fetchImpl });
    assert.deepEqual(asked, ['https://a.com/sitemap.xml']);
    assert.deepEqual(res.urls, ['https://a.com/x']);
});
