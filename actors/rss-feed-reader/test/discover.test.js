import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commonFeedUrls, findFeedLinks } from '../src/discover.js';
import { bodyText } from '../src/fetch.js';
import { fixture } from './helpers.js';

test('finds the feed a real page declares (Stack Overflow blog)', () => {
    const links = findFeedLinks(bodyText(fixture('stackoverflow_blog_html')), 'https://stackoverflow.blog/');
    assert.equal(links[0].url, 'https://stackoverflow.blog/feed/');
    assert.equal(links[0].type, 'application/rss+xml');
});

test('main feed first, comment feeds last, relative hrefs resolved', () => {
    const html = `<html><head>
      <link rel="alternate" type="application/rss+xml" title="Blog » Comments Feed" href="/comments/feed/">
      <link rel="alternate" type="application/atom+xml" href="/atom.xml">
      <link rel="alternate" type="application/feed+json" href="https://cdn.ex.com/feed.json">
      <link rel="alternate" hreflang="es" href="/es/">
      <link rel="stylesheet" href="/s.css"></head></html>`;
    const links = findFeedLinks(html, 'https://ex.com/blog/post');
    assert.deepEqual(links.map((l) => l.url), ['https://ex.com/atom.xml', 'https://cdn.ex.com/feed.json', 'https://ex.com/comments/feed/']);
    assert.equal(links[2].comments, true);
});

test('common feed paths include the page folder', () => {
    const urls = commonFeedUrls('https://ex.com/blog/');
    assert.equal(urls[0], 'https://ex.com/blog/feed');
    assert.ok(urls.includes('https://ex.com/rss.xml'));
    assert.equal(new Set(urls).size, urls.length);
});
