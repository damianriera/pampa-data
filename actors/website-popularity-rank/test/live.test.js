import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HistoryClient, downloadRanks, getLatestList } from '../src/tranco.js';

test('live: Tranco list and history', { skip: !process.env.LIVE }, async () => {
    const list = await getLatestList();
    const ranks = await downloadRanks(list.downloadUrl, new Set(['github.com']));
    assert.ok(ranks.get('github.com') < 1000);
    const h = await new HistoryClient().history('github.com');
    assert.ok(h.length > 0);
});
