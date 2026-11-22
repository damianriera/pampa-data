import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, normalizeInput, toUrl } from '../src/input.js';

test('toUrl adds https and rejects non-web values', () => {
    assert.equal(toUrl('Example.com/shop').href, 'https://example.com/shop');
    assert.equal(toUrl('http://example.com').href, 'http://example.com/');
    for (const bad of ['', 'not a url', 'ftp://example.com', 'localhost', '127.0.0.1', 'http://10.0.0.1/', 'printer.local', 42]) {
        assert.equal(toUrl(bad), null, String(bad));
    }
});

test('normalizeInput dedupes, accepts {url} objects and validates numbers', () => {
    const n = normalizeInput({ websites: ['example.com', 'https://example.com/', { url: 'shop.example.org' }, 'nope'] });
    assert.equal(n.targets.length, 2);
    assert.deepEqual(n.invalid, ['nope']);
    assert.equal(n.targets[0].explicitScheme, false);
    assert.equal(n.includeDns, true);
    assert.equal(n.maxConcurrency, 5);
    assert.throws(() => normalizeInput({}), InputError);
    assert.throws(() => normalizeInput({ websites: 'example.com' }), InputError);
    assert.throws(() => normalizeInput({ websites: ['a.com'], maxConcurrency: 0 }), InputError);
    assert.throws(() => normalizeInput({ websites: Array.from({ length: 5001 }, (_, i) => `s${i}.com`) }), /At most/);
});
