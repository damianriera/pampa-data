import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bodyText } from '../src/fetch.js';
import { NotAFeedError, cleanAuthor, durationSeconds, htmlToText, looksLikeHtml, materialize, parseFeed, toIsoDate } from '../src/parse.js';
import { fixture } from './helpers.js';

const parsed = (name) => {
    const f = fixture(name);
    const out = parseFeed(bodyText(f), f.url);
    out.items.forEach(materialize);
    return out;
};

test('RSS 2.0 (WordPress, GitHub blog): items, categories, author, full content', () => {
    const { feed, items } = parsed('github_blog_rss');
    assert.equal(feed.feedType, 'rss');
    assert.equal(feed.title, 'The GitHub Blog');
    assert.equal(feed.link, 'https://github.blog/');
    assert.equal(feed.language, 'en-US');
    assert.equal(items.length, 10);
    const first = items[0];
    assert.equal(first.title, 'The best things in open source are built together');
    assert.match(first.link, /^https:\/\/github\.blog\/open-source\//);
    assert.equal(first.published, '2026-11-19T16:00:00.000Z');
    assert.equal(first.author, 'Katie Liu');
    assert.ok(first.categories.includes('Open Source'));
    assert.match(first.summary, /^Introducing Replica/);
    assert.ok(first.contentText.length > first.summary.length, 'content:encoded gives the full article');
    assert.doesNotMatch(first.contentText, /<\w+/, 'no HTML left in text');
});

test('RSS served as application/octet-stream (python.org blog)', () => {
    const { feed, items } = parsed('python_blog_rss');
    assert.equal(feed.title, 'Python Insider');
    assert.equal(items.length, 50);
    assert.equal(items[0].author, 'Stan Ulbrych');
    assert.deepEqual(items[0].categories, ['docs']);
});

test('RSS 1.0 / RDF (Debian news) with dc:date', () => {
    const { feed, items } = parsed('debian_rdf');
    assert.equal(feed.feedType, 'rss1');
    assert.equal(feed.lastUpdated, '2026-11-21T23:29:25.000Z');
    assert.equal(items.length, 7);
    assert.equal(items[0].title, 'Updated Debian 13: 13.8 released');
    assert.equal(items[0].link, 'https://www.debian.org/News/2026/20261121');
    assert.equal(items[0].published, '2026-11-21T00:00:00.000Z');
});

test('Atom (xkcd): link href, updated date, image from content', () => {
    const { feed, items } = parsed('xkcd_atom');
    assert.equal(feed.feedType, 'atom');
    assert.equal(feed.link, 'https://xkcd.com/');
    assert.equal(items[0].title, 'Ivory Tower Elites');
    assert.equal(items[0].link, 'https://xkcd.com/3328/');
    assert.equal(items[0].published, '2026-11-23T00:00:00.000Z');
    assert.equal(items[0].image, 'https://imgs.xkcd.com/comics/ivory_tower_elites.png');
});

test('JSON Feed (jsonfeed.org)', () => {
    const { feed, items } = parsed('jsonfeed_org');
    assert.equal(feed.feedType, 'json');
    assert.equal(feed.title, 'JSON Feed');
    assert.equal(items[0].title, 'JSON Feed version 1.1');
    assert.equal(items[0].published, '2020-08-07T16:44:36.000Z');
    assert.match(items[0].summary, /updated the spec to version 1\.1/);
});

test('podcast (NPR Planet Money, trimmed to 3 episodes): enclosure, duration, episode image', () => {
    const { feed, items } = parsed('npr_podcast');
    assert.equal(feed.title, 'Planet Money');
    assert.ok(feed.image);
    const ep = items[0];
    assert.equal(ep.enclosureType, 'audio/mpeg');
    assert.equal(ep.enclosureLengthBytes, 23613527);
    assert.equal(ep.durationSeconds, 1475);
    assert.match(ep.enclosureUrl, /\.mp3/);
    assert.match(ep.image, /^https:\/\/npr\.brightspotcdn\.com\//);
});

test('HTML pages and other XML are not feeds', () => {
    const html = bodyText(fixture('stackoverflow_blog_html'));
    assert.ok(looksLikeHtml(html));
    assert.throws(() => parseFeed(html, 'https://stackoverflow.blog/'), NotAFeedError);
    assert.throws(() => parseFeed('<urlset><url><loc>https://a.com/</loc></url></urlset>', 'https://a.com/'), /root element: urlset/);
    assert.throws(() => parseFeed('{"a":1}', 'https://a.com/'), NotAFeedError);
});

test('date, duration and author helpers', () => {
    assert.equal(toIsoDate('Mon, 24 Nov 2026 10:00:00 GMT'), '2026-11-24T10:00:00.000Z');
    assert.equal(toIsoDate('Mon, 24 Nov 2026 10:00:00 CET'), '2026-11-24T09:00:00.000Z');
    assert.equal(toIsoDate('2026-11-24 10:00:00'), new Date('2026-11-24T10:00:00').toISOString());
    assert.equal(toIsoDate('not a date'), null);
    assert.equal(durationSeconds('1:02:03'), 3723);
    assert.equal(durationSeconds('62:03'), 3723);
    assert.equal(durationSeconds('3723'), 3723);
    assert.equal(cleanAuthor('jane@example.com (Jane Doe)'), 'Jane Doe');
    assert.equal(cleanAuthor('noreply@blogger.com'), null);
    assert.equal(htmlToText('<p>a &amp; b</p><p>c</p>', { paragraphs: true }), 'a & b\n\nc');
});

test('RSS edge cases: guid as link, relative links, e-mail authors, media:content image', () => {
    const xml = `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>
      <title>T &amp; Co</title><link>https://ex.com/blog/</link>
      <item><title><![CDATA[<b>Hello</b> world]]></title><guid>https://ex.com/p/1</guid><author>me@ex.com (Me)</author>
        <media:content url="/img/1.jpg" medium="image"/><description>&lt;p&gt;Hi&lt;/p&gt;</description></item>
      <item><title>Two</title><link>/p/2</link><guid isPermaLink="false">abc</guid></item>
    </channel></rss>`;
    const { feed, items } = parseFeed(xml, 'https://ex.com/feed');
    items.forEach(materialize);
    assert.equal(feed.title, 'T & Co');
    assert.equal(items[0].title, 'Hello world');
    assert.equal(items[0].link, 'https://ex.com/p/1');
    assert.equal(items[0].author, 'Me');
    assert.equal(items[0].image, 'https://ex.com/img/1.jpg');
    assert.equal(items[0].summary, 'Hi');
    assert.equal(items[1].link, 'https://ex.com/p/2');
    assert.equal(items[1].guid, 'abc');
});

test('Atom with xhtml content and feed-level author', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><title type="text">X</title><author><name>Ann</name></author>
      <link rel="self" href="https://x.org/atom.xml"/><link href="https://x.org/"/>
      <entry><title>E</title><id>tag:x,1</id><updated>2026-01-02T00:00:00Z</updated><link rel="alternate" type="text/html" href="/e"/>
      <link rel="enclosure" type="audio/mpeg" length="10" href="https://x.org/e.mp3"/><category term="news" label="News"/>
      <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>Body <b>text</b></p></div></content></entry></feed>`;
    const { feed, items } = parseFeed(xml, 'https://x.org/atom.xml');
    materialize(items[0]);
    assert.equal(feed.link, 'https://x.org/');
    assert.equal(items[0].link, 'https://x.org/e');
    assert.equal(items[0].author, 'Ann');
    assert.equal(items[0].published, '2026-01-02T00:00:00.000Z');
    assert.equal(items[0].enclosureUrl, 'https://x.org/e.mp3');
    assert.deepEqual(items[0].categories, ['News']);
    assert.match(items[0].summary, /Body\s+text/);
});

test('entity expansion bombs are refused', () => {
    const bomb = `<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY a "${'x'.repeat(5000)}"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">]>
      <rss><channel><title>&c;&c;&c;&c;&c;&c;&c;&c;&c;&c;&c;&c;</title></channel></rss>`;
    try {
        const { feed } = parseFeed(bomb, 'https://a.com/');
        assert.ok((feed.title ?? '').length < 1e6);
    } catch (err) {
        assert.ok(err instanceof NotAFeedError);
    }
});
