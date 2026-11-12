import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQueries } from '../src/expand.js';

test('plain keyword only by default', () => {
    assert.deepEqual(buildQueries('seo tools'), [{ query: 'seo tools', modifier: null }]);
});

test('alphabet, questions and prepositions', () => {
    const q = buildQueries('seo tools', { expandAlphabet: true, expandQuestions: true, expandPrepositions: true });
    assert.equal(q[0].query, 'seo tools');
    assert.equal(q[1].query, 'seo tools a');
    assert.equal(q[26].query, 'seo tools z');
    assert.ok(q.some((x) => x.query === 'how seo tools' && x.modifier === 'how+'));
    assert.ok(q.some((x) => x.query === 'seo tools vs' && x.modifier === '+vs'));
});

test('question words follow the language, unknown languages fall back to English', () => {
    assert.ok(buildQueries('café', { language: 'es', expandQuestions: true }).some((x) => x.query === 'cómo café'));
    assert.ok(buildQueries('kaffee', { language: 'de-AT', expandQuestions: true }).some((x) => x.query === 'wie kaffee'));
    assert.ok(buildQueries('x', { language: 'ja', expandQuestions: true }).some((x) => x.query === 'how x'));
});

test('custom modifiers: suffix or {keyword} template, no duplicates', () => {
    const q = buildQueries('crm', { customModifiers: ['best {keyword}', 'pricing', 'PRICING'] });
    assert.deepEqual(q.map((x) => x.query), ['crm', 'best crm', 'crm pricing']);
});
