import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogle, google, youtube } from '../src/sources/google.js';
import { parseBing, bing, bingMarket } from '../src/sources/bing.js';
import { fixtureText, opts } from './helpers.js';

test('Google: parses saved suggestions', () => {
    const s = parseGoogle(fixtureText('google_coffee_maker.json'));
    assert.equal(s.length, 10);
    assert.equal(s[0], 'coffee maker');
    assert.ok(s.includes('coffee maker with grinder'));
});

test('YouTube: same format, different suggestions', () => {
    const s = parseGoogle(fixtureText('youtube_coffee_maker.json'));
    assert.equal(s.length, 10);
    assert.ok(s.includes('coffee maker review'));
});

test('Google: keeps accents (UTF-8)', () => {
    const s = parseGoogle(fixtureText('google_cafe_es_ar.json'));
    assert.ok(s.includes('café martinez'));
    assert.ok(s.includes('café instantáneo'));
});

test('Google: no suggestions and empty body', () => {
    assert.deepEqual(parseGoogle(fixtureText('google_empty.json')), []);
    assert.deepEqual(parseGoogle(''), []);
    assert.throws(() => parseGoogle('{"x":1}'), /Unexpected/);
});

test('Bing: parses saved suggestions', () => {
    const s = parseBing(fixtureText('bing_coffee_maker.json'));
    assert.ok(s.length >= 5);
    assert.equal(s[0], 'coffee maker');
    assert.deepEqual(parseBing(fixtureText('bing_empty.json')), []);
    assert.deepEqual(parseBing(''), []);
    assert.throws(() => parseBing('[]'), /Unexpected/);
});

test('URLs carry language, country and source', () => {
    const g = new URL(google.buildUrl('café con leche', opts({ language: 'es', country: 'ar' })));
    assert.equal(g.searchParams.get('q'), 'café con leche');
    assert.equal(g.searchParams.get('hl'), 'es');
    assert.equal(g.searchParams.get('gl'), 'ar');
    assert.equal(g.searchParams.get('ds'), null);
    assert.equal(new URL(youtube.buildUrl('x', opts())).searchParams.get('ds'), 'yt');
    assert.equal(new URL(google.buildUrl('x', opts({ country: null }))).searchParams.get('gl'), null);
    assert.equal(new URL(bing.buildUrl('x', opts({ language: 'es', country: 'ar' }))).searchParams.get('mkt'), 'es-AR');
    assert.equal(bingMarket('pt-br', null), 'pt-br');
    assert.equal(bingMarket('pt-br', 'pt'), 'pt-PT');
});
