import { test } from 'node:test';
import assert from 'node:assert/strict';

import { InputError, normalizeInput, toTermGroups } from '../src/input.js';

test('toTermGroups splits comparisons and dedupes', () => {
    assert.deepEqual(toTermGroups(['bitcoin', ' bitcoin , ethereum ,bitcoin', '', '  ']), [['bitcoin'], ['bitcoin', 'ethereum']]);
    assert.throws(() => toTermGroups(['a,b,c,d,e,f']), InputError);
});

test('defaults', () => {
    const i = normalizeInput({ searchTerms: ['x'] });
    assert.equal(i.mode, 'explore');
    assert.equal(i.timeRange, 'today 12-m');
    assert.equal(i.geo, '');
    assert.equal(i.property, '');
    assert.equal(i.maxRetries, 8);
    assert.equal(i.includeRelatedTopics, false);
});

test('explore needs terms', () => {
    assert.throws(() => normalizeInput({}), /at least one search term/);
});

test('trendingNow does not need terms and defaults to geo', () => {
    const i = normalizeInput({ mode: 'trendingNow', geo: 'ar' });
    assert.deepEqual(i.trendingGeos, ['AR']);
    assert.deepEqual(normalizeInput({ mode: 'trendingNow' }).trendingGeos, ['US']);
});

test('custom time range validation', () => {
    assert.equal(normalizeInput({ searchTerms: ['x'], customTimeRange: '2024-01-01 2024-06-30' }).timeRange, '2024-01-01 2024-06-30');
    assert.throws(() => normalizeInput({ searchTerms: ['x'], customTimeRange: '2024-13-01 2024-06-30' }), InputError);
    assert.throws(() => normalizeInput({ searchTerms: ['x'], customTimeRange: '2024-06-30 2024-01-01' }), /before/);
    assert.throws(() => normalizeInput({ searchTerms: ['x'], customTimeRange: '2003-01-01 2004-06-30' }), /2004/);
});

test('geo, property and resolution validation', () => {
    assert.equal(normalizeInput({ searchTerms: ['x'], geo: 'us-ca' }).geo, 'US-CA');
    assert.throws(() => normalizeInput({ searchTerms: ['x'], geo: 'United States' }), /Invalid geo/);
    assert.equal(normalizeInput({ searchTerms: ['x'], searchProperty: 'shopping' }).property, 'froogle');
    assert.throws(() => normalizeInput({ searchTerms: ['x'], searchProperty: 'maps' }), InputError);
    assert.throws(() => normalizeInput({ searchTerms: ['x'], regionResolution: 'planet' }), InputError);
    assert.throws(() => normalizeInput({ searchTerms: ['x'], timeRange: 'yesterday' }), InputError);
});
