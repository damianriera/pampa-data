import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditPage, summarize, ISSUE_TEXT } from '../src/audit.js';
import { fixture } from './helpers.js';

test('python.org: redirect, short title, several H1, no canonical', () => {
    const item = auditPage(fixture('python_org'), { robotsTxtAllowed: true });
    assert.equal(item.finalUrl, 'https://www.python.org/');
    assert.equal(item.redirectCount, 1);
    assert.deepEqual(item.redirectChain, [{ url: 'http://python.org/', statusCode: 301 }]);
    assert.equal(item.title, 'Welcome to Python.org');
    assert.equal(item.titleLength, 21);
    assert.equal(item.metaDescription, 'The official home of the Python Programming Language');
    assert.equal(item.lang, 'en');
    assert.equal(item.canonical, null);
    assert.equal(item.indexable, true);
    assert.ok(item.h1Count > 1);
    assert.deepEqual(item.jsonLdTypes.sort(), ['SearchAction', 'WebSite']);
    assert.equal(item.openGraph.image, 'https://www.python.org/static/opengraph-icon-200x200.png');
    for (const code of ['redirected', 'title_too_short', 'description_too_short', 'multiple_h1', 'canonical_missing']) {
        assert.ok(item.issues.includes(code), code);
    }
    assert.ok(!item.issues.includes('og_missing'));
    assert.equal(item.issueCount, item.issues.length);
    assert.ok(item.wordCount > 300);
    assert.ok(item.internalLinkCount > 20 && item.externalLinkCount > 10);
    assert.ok(!('internalLinks' in item));
    assert.ok(Array.isArray(item.h2));
});

test('MDN: self canonical, long description, no Open Graph or JSON-LD', () => {
    const item = auditPage(fixture('developer_mozilla_org'), { robotsTxtAllowed: true, includeLinks: true });
    assert.equal(item.canonical, 'https://developer.mozilla.org/en-US/docs/Web/HTML');
    assert.equal(item.canonicalIsSelf, true);
    assert.equal(item.h1Count, 1);
    assert.ok(item.metaDescriptionLength > 160);
    assert.deepEqual(item.issues, ['description_too_long', 'og_missing', 'structured_data_missing']);
    assert.match(item.issuesText, /longer than 160/);
    assert.equal(item.internalLinks.length, item.internalLinkCount);
    assert.ok(item.internalLinks.every((l) => l.url.startsWith('https://developer.mozilla.org/')));
});

test('404 page is not indexable and only flags the status', () => {
    const item = auditPage(fixture('notfound_python_org'), { robotsTxtAllowed: true });
    assert.equal(item.statusCode, 404);
    assert.equal(item.indexable, false);
    assert.deepEqual(item.issues, ['http_error']);
});

function fakeResponse(html, extra = {}) {
    return {
        requestedUrl: 'https://shop.example.com/a', url: 'https://shop.example.com/a', statusCode: 200,
        contentType: 'text/html; charset=utf-8', headers: {}, redirectChain: [], responseTimeMs: 2500,
        bytes: html.length, truncated: false, buffer: Buffer.from(html), ...extra,
    };
}

test('noindex, canonical elsewhere, missing alt, hreflang, robots.txt block', () => {
    const html = `<html><head><title>A</title><title>B</title><meta name="robots" content="noindex, follow">
        <link rel="canonical" href="/b"><link rel="alternate" hreflang="es" href="https://shop.example.com/es/a">
        <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Product","offers":{"@type":"Offer"}}]}</script>
        <script type="application/ld+json">{broken</script></head>
        <body><img src="x.png"><img src="y.png" alt=""><a href="/c">C</a><a href="https://other.com" rel="nofollow">O</a>
        <a href="mailto:x@y.z">mail</a></body></html>`;
    const item = auditPage(fakeResponse(html, { headers: { 'x-robots-tag': 'noarchive' } }), { robotsTxtAllowed: false });
    assert.equal(item.canonical, 'https://shop.example.com/b');
    assert.equal(item.canonicalIsSelf, false);
    assert.equal(item.noindex, true);
    assert.equal(item.xRobotsTag, 'noarchive');
    assert.equal(item.indexable, false);
    assert.deepEqual(item.hreflang, [{ lang: 'es', url: 'https://shop.example.com/es/a' }]);
    assert.deepEqual(item.jsonLdTypes.sort(), ['Offer', 'Product']);
    assert.equal(item.jsonLdInvalidBlocks, 1);
    assert.equal(item.imagesMissingAlt, 1);
    assert.equal(item.imagesEmptyAlt, 1);
    assert.equal(item.internalLinkCount, 1);
    assert.equal(item.externalLinkCount, 1);
    assert.equal(item.nofollowLinkCount, 1);
    for (const code of ['noindex', 'canonical_other_page', 'multiple_titles', 'images_missing_alt', 'blocked_by_robots_txt',
        'slow_response', 'h1_missing', 'description_missing', 'lang_missing', 'viewport_missing', 'low_word_count']) {
        assert.ok(item.issues.includes(code), code);
    }
    for (const code of item.issues) assert.ok(ISSUE_TEXT[code], code);
});

test('canonical from the Link header and non-HTML pages', () => {
    const item = auditPage(fakeResponse('<html><body>hi</body></html>', { headers: { link: '<https://shop.example.com/a>; rel="canonical"' } }));
    assert.equal(item.canonicalIsSelf, true);
    const pdf = auditPage(fakeResponse('%PDF-1.4', { contentType: 'application/pdf' }));
    assert.ok(pdf.issues.includes('not_html'));
    assert.equal(pdf.indexable, false);
});

test('summary counts issues and finds duplicate titles among indexable pages', () => {
    const rows = [
        { finalUrl: 'https://a/1', title: 'Same', metaDescription: 'd1', indexable: true, issues: ['h1_missing'], responseTimeMs: 100 },
        { finalUrl: 'https://a/2', title: 'Same', metaDescription: 'd2', indexable: true, issues: ['h1_missing', 'noindex'], responseTimeMs: 300 },
        { finalUrl: 'https://a/3', title: 'Same', metaDescription: 'd2', indexable: false, issues: [], responseTimeMs: 200 },
    ];
    const s = summarize(rows);
    assert.equal(s.pagesAudited, 3);
    assert.equal(s.indexablePages, 2);
    assert.equal(s.averageResponseTimeMs, 200);
    assert.equal(s.issueCounts.h1_missing.count, 2);
    assert.deepEqual(s.duplicateTitles, [{ value: 'Same', count: 2, urls: ['https://a/1', 'https://a/2'] }]);
    assert.deepEqual(s.duplicateDescriptions, []);
});
