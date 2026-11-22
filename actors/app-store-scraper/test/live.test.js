import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTask } from '../src/collect.js';
import { createClient } from '../src/itunes.js';
import { input } from './helpers.js';

const live = { skip: !process.env.LIVE };

test('live: search, app and developer lookups', live, async () => {
    const client = createClient();
    const s = await runTask({ kind: 'search', country: 'us', term: 'habit tracker' }, client, input({ maxResultsPerSearch: 10 }));
    assert.equal(s.rows.length, 10);
    assert.ok(s.rows.every((r) => r.appId && r.name && r.url));
    const a = await runTask({ kind: 'apps', country: 'gb', type: 'id', refs: ['324684580'] }, client, input());
    assert.equal(a.rows[0].currency, 'GBP');
    const d = await runTask({ kind: 'developer', country: 'us', developerId: '284882218' }, client, input());
    assert.ok(d.rows.length >= 3);
});
