import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditPage } from '../src/audit.js';
import { fetchUrl } from '../src/fetch.js';
import { collectSitemapUrls } from '../src/sitemap.js';

test('live: python.org redirects to www and is audited', { skip: !process.env.LIVE }, async () => {
    const item = auditPage(await fetchUrl('http://python.org/'), { robotsTxtAllowed: true });
    assert.equal(item.finalUrl, 'https://www.python.org/');
    assert.ok(item.redirectCount >= 1);
    assert.ok(item.title);
    assert.equal(item.statusCode, 200);
});

test('live: wordpress.org sitemap index expands to pages', { skip: !process.env.LIVE }, async () => {
    const getRobots = async (origin) => ({ text: await (await fetch(`${origin}/robots.txt`)).text() });
    const { urls } = await collectSitemapUrls(['https://wordpress.org/'], { limit: 20, getRobots });
    assert.equal(urls.length, 20);
});
