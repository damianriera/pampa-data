import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseResults } from '../src/itunes.js';
import { toApp } from '../src/transform.js';
import { fixtureText } from './helpers.js';

test('maps a real search result to a clean row', () => {
    const [r] = parseResults(fixtureText('search_habit_tracker_us.json'));
    const row = toApp(r, { country: 'us' });
    assert.equal(row.appId, 1438388363);
    assert.equal(row.name, 'Habit Tracker');
    assert.equal(row.url, 'https://apps.apple.com/us/app/habit-tracker/id1438388363');
    assert.equal(row.developerUrl, 'https://apps.apple.com/us/developer/innergrow/id1828382777');
    assert.equal(row.platform, 'ios');
    assert.equal(row.isFree, true);
    assert.equal(row.currency, 'USD');
    assert.equal(typeof row.rating, 'number');
    assert.ok(row.rating > 0 && row.rating <= 5);
    assert.ok(row.ratingCount > 1000);
    assert.equal(typeof row.fileSizeBytes, 'number');
    assert.ok(row.fileSizeMB > 1);
    assert.ok(row.genres.includes('Productivity'));
    assert.ok(row.screenshotUrls.length > 0);
    assert.ok(row.description.length > 50);
    assert.match(row.iconUrl, /^https:\/\/is\d-ssl\.mzstatic\.com\//);
    assert.match(row.releaseDate, /^\d{4}-\d{2}-\d{2}T/);
});

test('can leave out description and screenshots', () => {
    const [r] = parseResults(fixtureText('search_habit_tracker_us.json'));
    const row = toApp(r, { country: 'us', includeDescription: false, includeScreenshots: false });
    assert.equal('description' in row, false);
    assert.equal('releaseNotes' in row, false);
    assert.equal('screenshotUrls' in row, false);
});

test('mac apps are marked as mac', () => {
    const rows = parseResults(fixtureText('search_photoshop_mac_us.json')).map((r) => toApp(r, { country: 'us' }));
    assert.equal(rows[0].platform, 'mac');
    assert.ok(rows.some((r) => r.platform === 'ios'));
});

test('developer lookup drops the developer row', () => {
    const raw = JSON.parse(fixtureText('developer_meta_us.json')).results;
    assert.equal(raw[0].wrapperType, 'artist');
    const apps = parseResults(fixtureText('developer_meta_us.json'));
    assert.equal(apps.length, raw.length - 1);
    assert.ok(apps.every((a) => a.artistId === 284882218));
});

test('rejects a non-API answer', () => {
    assert.throws(() => parseResults('{"error":"x"}'), /Unexpected/);
    assert.deepEqual(parseResults(fixtureText('empty.json')), []);
});
