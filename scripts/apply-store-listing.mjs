// Applies an Actor's Store listing (categories, SEO title, SEO description) from
// .actor/store-listing.json through the Apify API. These fields are not part of
// actor.json, so `apify push` does not set them.
//
// Usage (from an Actor folder): APIFY_TOKEN=... node ../../scripts/apply-store-listing.mjs
// Does nothing when the file is missing. Never changes pricing or visibility.
import { readFile } from 'node:fs/promises';

const ALLOWED = ['categories', 'seoTitle', 'seoDescription'];
const token = process.env.APIFY_TOKEN;
if (!token) throw new Error('APIFY_TOKEN is not set');

let listing;
try {
    listing = JSON.parse(await readFile('.actor/store-listing.json', 'utf8'));
} catch (err) {
    if (err.code === 'ENOENT') {
        console.log('No .actor/store-listing.json, nothing to apply.');
        process.exit(0);
    }
    throw err;
}

const body = Object.fromEntries(Object.entries(listing).filter(([key]) => ALLOWED.includes(key)));
if (body.seoTitle && body.seoTitle.length > 60) throw new Error('seoTitle is longer than 60 characters');
if (body.seoDescription && body.seoDescription.length > 160) throw new Error('seoDescription is longer than 160 characters');

const { name } = JSON.parse(await readFile('.actor/actor.json', 'utf8'));
const api = (path, init = {}) => fetch(`https://api.apify.com/v2${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});

const me = await (await api('/users/me')).json();
const actorId = `${me.data.username}~${name}`;
const res = await api(`/acts/${actorId}`, { method: 'PUT', body: JSON.stringify(body) });
if (!res.ok) throw new Error(`Updating ${actorId} failed: ${res.status} ${await res.text()}`);
console.log(`Store listing applied to ${actorId}:`, body);
