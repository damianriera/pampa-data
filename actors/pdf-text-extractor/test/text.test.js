import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessLanguage, normalizeLanguage } from '../src/language.js';
import { keywordList, parsePdfDate, str } from '../src/meta.js';
import { buildLines, countWords, linesToText, pagesToMarkdown, truncate } from '../src/text.js';

const item = (str, size, x, y, { eol = false, width = str.length * size * 0.5, rotated = false } = {}) => ({
    str, hasEOL: eol, width, transform: rotated ? [0, size, -size, 0, x, y] : [size, 0, 0, size, x, y],
});

test('buildLines joins runs, adds missing spaces and keeps the largest font size', () => {
    const lines = buildLines([
        item('Form', 7, 10, 700), item('W-9', 24, 40, 700), item('(Rev. 2024)', 7, 10, 690, { eol: true }),
        item('Hello', 10, 10, 600), item('world', 10, 40, 600, { eol: true }),
        item('', 10, 0, 0, { eol: true }),
        item('arXiv:1706', 20, 5, 300, { rotated: true }),
    ]);
    assert.deepEqual(lines.map((l) => l.text), ['Form W-9 (Rev. 2024)', 'Hello world', '', 'arXiv:1706']);
    assert.equal(lines[0].size, 24);
    assert.equal(lines[3].rotated, true);
});

test('Markdown headings from font size, page markers, rotated text ignored', () => {
    const body = (t) => ({ text: t, size: 10, rotated: false });
    const pages = [
        [{ text: 'Annual Report', size: 20, rotated: false }, body('Intro paragraph one.'), body('continues here.'), { text: '', size: 0 },
            { text: '1 Overview', size: 12, rotated: false }, body('Body text that is long enough to be the body.')],
        [{ text: 'Results and', size: 14, rotated: false }, { text: 'Discussion', size: 14, rotated: false }, body('More body text, also long.'),
            { text: 'arXiv stamp', size: 20, rotated: true }],
    ];
    const md = pagesToMarkdown(pages, [3, 4]);
    assert.equal(md, [
        '<!-- page 3 -->', '# Annual Report', 'Intro paragraph one.\ncontinues here.', '### 1 Overview',
        'Body text that is long enough to be the body.', '<!-- page 4 -->', '## Results and Discussion',
        'More body text, also long.\narXiv stamp',
    ].join('\n\n'));
    assert.equal(linesToText([body('a'), body(''), body(''), body('b')]), 'a\n\nb');
});

test('words and truncation', () => {
    assert.equal(countWords("It's a test — 3 words? Ñandú 2026."), 7);
    assert.deepEqual(truncate('one two three four five', 13), { text: 'one two three', truncated: true });
    assert.deepEqual(truncate('short', 0), { text: 'short', truncated: false });
});

test('PDF dates, strings and keywords', () => {
    assert.equal(parsePdfDate("D:20240306081813-05'00'"), '2024-03-06T13:18:13.000Z');
    assert.equal(parsePdfDate('D:20261029094739+01\'00\''), '2026-10-29T08:47:39.000Z');
    assert.equal(parsePdfDate('D:20070223175637+02\'00\''), '2007-02-23T15:56:37.000Z');
    assert.equal(parsePdfDate('D:2024'), '2024-01-01T00:00:00.000Z');
    assert.equal(parsePdfDate('2024-04-10T21:11:43Z'), '2024-04-10T21:11:43.000Z');
    assert.equal(parsePdfDate('garbage'), null);
    assert.equal(parsePdfDate(undefined), null);
    assert.equal(str('  \u0000 '), null);
    assert.deepEqual(keywordList('BOE; Legislación consolidada, BOE'), ['BOE', 'Legislación consolidada']);
});

test('language guess and normalization', () => {
    assert.equal(guessLanguage('The quick brown fox is one of the animals that live in the forest and it is known for the speed of its run, which is not slow at all.'), 'en');
    assert.equal(guessLanguage('La Constitución española es la norma suprema del ordenamiento jurídico de España, a la que están sujetos todos los poderes públicos y los ciudadanos del país.'), 'es');
    assert.equal(guessLanguage('too short'), null);
    assert.equal(normalizeLanguage('en-US'), 'en');
    assert.equal(normalizeLanguage('ES'), 'es');
    assert.equal(normalizeLanguage('Spanish'), 'es');
    assert.equal(normalizeLanguage(''), null);
});
