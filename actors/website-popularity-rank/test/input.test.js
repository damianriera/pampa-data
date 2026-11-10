import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, normalizeInput, toDomain } from '../src/input.js';

test('toDomain reduces URLs and subdomains to the registrable domain', () => {
    assert.deepEqual(toDomain('https://www.BBC.co.uk/news?x=1'), { domain: 'bbc.co.uk', hostname: 'www.bbc.co.uk' });
    assert.equal(toDomain('docs.github.com').domain, 'github.com');
    assert.equal(toDomain('  mercadolibre.com.ar  ').domain, 'mercadolibre.com.ar');
    assert.equal(toDomain('192.168.0.1'), null);
    assert.equal(toDomain('not a domain'), null);
    assert.equal(toDomain('localhost'), null);
    assert.equal(toDomain(''), null);
});

test('normalizeInput dedupes, keeps invalid values aside and applies defaults', () => {
    const r = normalizeInput({ domains: ['github.com', 'https://github.com/x', 'bad value'], urls: [{ url: 'https://bbc.co.uk' }] });
    assert.deepEqual(r.targets.map((t) => t.domain), ['github.com', 'bbc.co.uk']);
    assert.deepEqual(r.invalid, ['bad value']);
    assert.equal(r.includeHistory, true);
    assert.equal(r.includeSiteInfo, false);
    assert.equal(r.maxConcurrency, 5);
});

test('normalizeInput rejects empty and malformed input', () => {
    assert.throws(() => normalizeInput({}), InputError);
    assert.throws(() => normalizeInput({ domains: 'github.com' }), InputError);
    assert.throws(() => normalizeInput({ domains: ['a.com'], maxConcurrency: 0 }), InputError);
});
