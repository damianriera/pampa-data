import { test } from 'node:test';
import assert from 'node:assert/strict';
import { materialize } from '../src/parse.js';
import { readSource } from '../src/reader.js';

test('live: xkcd Atom feed', { skip: !process.env.LIVE }, async () => {
    const r = await readSource('https://xkcd.com/atom.xml');
    assert.equal(r.feeds[0].feed.feedType, 'atom');
    assert.ok(r.feeds[0].items.length > 0);
    assert.ok(r.feeds[0].items[0].published);
});

test('live: a website is resolved to its feed (stackoverflow.blog)', { skip: !process.env.LIVE }, async () => {
    const r = await readSource('https://stackoverflow.blog/');
    assert.equal(r.discovered, true);
    const item = materialize(r.feeds[0].items[0]);
    assert.ok(item.title && item.link && item.summary);
});
