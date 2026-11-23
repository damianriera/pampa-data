import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed, parseRobots } from '../src/robots.js';
import { bodyText } from '../src/fetch.js';
import { fixture } from './helpers.js';

test('python.org robots.txt: grouped agents and the * group', () => {
    const robots = parseRobots(bodyText(fixture('robots_python_org')));
    assert.equal(isAllowed(robots, 'https://www.python.org/downloads/'), true);
    assert.equal(isAllowed(robots, 'https://www.python.org/webstats/2020/'), false);
    assert.equal(isAllowed(robots, 'https://www.python.org/', 'HTTrack'), false);
    assert.equal(isAllowed(robots, 'https://www.python.org/', 'puf'), false);
    assert.equal(isAllowed(robots, 'https://www.python.org/webstats/', 'Krugle'), false);
    assert.equal(isAllowed(robots, 'https://www.python.org/about/', 'Krugle'), true);
});

test('longest match wins, Allow wins ties, wildcards and $', () => {
    const robots = parseRobots(`Sitemap: https://x.com/sm.xml
User-agent: *
Disallow: /private
Allow: /private/public
Disallow: /*?q=
Disallow: /*.pdf$

User-agent: Googlebot
Disallow: /no-google/
Disallow:
`);
    assert.deepEqual(robots.sitemaps, ['https://x.com/sm.xml']);
    // Googlebot has its own group, so the * rules do not apply to it.
    assert.equal(isAllowed(robots, 'https://x.com/private', 'googlebot'), true);
    assert.equal(isAllowed(robots, 'https://x.com/no-google/x', 'googlebot'), false);
    assert.equal(isAllowed(robots, 'https://x.com/private/x', 'other'), false);
    assert.equal(isAllowed(robots, 'https://x.com/private/public/x', 'other'), true);
    assert.equal(isAllowed(robots, 'https://x.com/search?q=shoes', 'other'), false);
    assert.equal(isAllowed(robots, 'https://x.com/a.pdf', 'other'), false);
    assert.equal(isAllowed(robots, 'https://x.com/a.pdf?x=1', 'other'), true);
    assert.equal(isAllowed(parseRobots(''), 'https://x.com/anything'), true);
});
