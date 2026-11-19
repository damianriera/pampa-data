import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectWebsite } from '../src/detect.js';
import { loadFingerprints } from '../src/fingerprints.js';

test('live: wordpress.org is WordPress and has DNS records', { skip: !process.env.LIVE }, async () => {
    const item = await detectWebsite({ input: 'wordpress.org', url: 'https://wordpress.org/', hostname: 'wordpress.org', explicitScheme: false },
        loadFingerprints(), { includeDns: true, includeDetails: false, minConfidence: 0 });
    assert.ok(item.cms.includes('WordPress'), item.technologyNames);
    assert.ok(item.technologies.some((t) => t.detectedBy.includes('dns') || t.detectedBy.includes('headers')));
});
