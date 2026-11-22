import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, normalizeInput, parseAppRef, parseDeveloperRef } from '../src/input.js';

test('app references: URLs, ids and bundle ids', () => {
    assert.deepEqual(parseAppRef('https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580'), { type: 'id', value: '324684580' });
    assert.deepEqual(parseAppRef('https://apps.apple.com/ar/app/facebook/id284882215?uo=4'), { type: 'id', value: '284882215' });
    assert.deepEqual(parseAppRef('id284882215'), { type: 'id', value: '284882215' });
    assert.deepEqual(parseAppRef('284882215'), { type: 'id', value: '284882215' });
    assert.deepEqual(parseAppRef('com.spotify.client'), { type: 'bundleId', value: 'com.spotify.client' });
    assert.throws(() => parseAppRef('spotify'), InputError);
    assert.throws(() => parseAppRef('https://example.com/app'), InputError);
});

test('developer references', () => {
    assert.equal(parseDeveloperRef('https://apps.apple.com/us/developer/meta-platforms-inc/id284882218'), '284882218');
    assert.equal(parseDeveloperRef('284882218'), '284882218');
    assert.throws(() => parseDeveloperRef('https://apps.apple.com/us/app/facebook/id284882215'), InputError);
    assert.throws(() => parseDeveloperRef('Meta'), InputError);
});

test('defaults and dedup', () => {
    const i = normalizeInput({ searchTerms: ['Habit tracker', 'habit  tracker'], apps: ['324684580', 'id324684580'] });
    assert.deepEqual(i.searchTerms, ['Habit tracker']);
    assert.equal(i.apps.length, 1);
    assert.deepEqual(i.countries, ['us']);
    assert.equal(i.platform, 'iphone');
    assert.equal(i.maxResultsPerSearch, 50);
    assert.equal(i.includeDescription, true);
    assert.equal(i.language, null);
});

test('rejects bad input', () => {
    assert.throws(() => normalizeInput({}), /at least one/);
    assert.throws(() => normalizeInput({ searchTerms: ['a'], countries: ['usa'] }), /two letters/);
    assert.throws(() => normalizeInput({ searchTerms: ['a'], countries: [] }), /at least one country/);
    assert.throws(() => normalizeInput({ searchTerms: ['a'], platform: 'android' }), /platform/);
    assert.throws(() => normalizeInput({ searchTerms: ['a'], maxResultsPerSearch: 500 }), /1 to 200/);
    assert.throws(() => normalizeInput({ searchTerms: ['a'], language: 'english' }), /language/);
    assert.equal(normalizeInput({ searchTerms: ['a'], language: 'es-ES', countries: ['AR'] }).language, 'es_es');
});
