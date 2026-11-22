import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFingerprints, parsePattern, resolveVersion } from '../src/fingerprints.js';

test('parsePattern reads regex, version and confidence', () => {
    const p = parsePattern('^WordPress(?: ([\\d.]+))?\\;version:\\1\\;confidence:50');
    assert.equal(p.confidence, 50);
    assert.equal(p.version, '\\1');
    assert.equal(resolveVersion(p.version, p.regex.exec('WordPress 6.4.2')), '6.4.2');
    assert.equal(parsePattern('').regex, null);
    assert.equal(parsePattern('(unclosed'), null);
});

test('resolveVersion handles ternaries and empty groups', () => {
    assert.equal(resolveVersion('\\1?2.x:1.x', ['x', 'y']), '2.x');
    assert.equal(resolveVersion('\\1?2.x:1.x', ['x', undefined]), '1.x');
    assert.equal(resolveVersion('\\1', ['x', undefined]), null);
});

test('the bundled fingerprints load and compile', () => {
    const fp = loadFingerprints();
    assert.ok(fp.technologies.length > 7000);
    const wp = fp.byName.get('WordPress');
    assert.deepEqual(wp.categories, ['CMS', 'Blogs']);
    assert.ok(wp.implies.some((i) => i.name === 'PHP'));
    assert.ok(wp.meta.some((m) => m.key === 'generator'));
});
