import assert from 'node:assert/strict';
import { test } from 'node:test';

import { processWebsite } from '../src/site.js';

test('live: wordpress.org favicon and logo', { skip: !process.env.LIVE }, async () => {
    const item = await processWebsite({ input: 'wordpress.org', url: 'https://wordpress.org/', hostname: 'wordpress.org' },
        { checkImages: true, includeHeaderSvg: true, downloadImages: 'none' });
    assert.ok(item.favicon);
    assert.ok(item.bestIcon);
    assert.ok(item.logo);
    assert.ok(item.icons.length >= 1);
    assert.ok(item.icons.every((i) => i.type && i.width));
});
