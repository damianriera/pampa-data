import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, normalizeInput, parseBoard } from '../src/input.js';

test('parseBoard understands career page URLs of every ATS', () => {
    assert.deepEqual(parseBoard('https://boards.greenhouse.io/airbnb'), { input: 'https://boards.greenhouse.io/airbnb', ats: 'greenhouse', slug: 'airbnb' });
    assert.equal(parseBoard('https://job-boards.greenhouse.io/stripe/jobs/123').slug, 'stripe');
    assert.equal(parseBoard('https://boards.greenhouse.io/embed/job_board?for=figma').slug, 'figma');
    assert.deepEqual(parseBoard('jobs.lever.co/spotify'), { input: 'jobs.lever.co/spotify', ats: 'lever', slug: 'spotify', region: 'global' });
    assert.equal(parseBoard('https://jobs.eu.lever.co/acme/abc').region, 'eu');
    assert.deepEqual(parseBoard('https://jobs.ashbyhq.com/ramp'), { input: 'https://jobs.ashbyhq.com/ramp', ats: 'ashby', slug: 'ramp' });
    assert.deepEqual(parseBoard('https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/details/x'), {
        input: 'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/details/x',
        ats: 'workday', host: 'nvidia.wd5.myworkdayjobs.com', tenant: 'nvidia', site: 'NVIDIAExternalCareerSite', lang: 'en-US', slug: 'nvidia/NVIDIAExternalCareerSite',
    });
    assert.equal(parseBoard('https://acme.wd1.myworkdayjobs.com/Careers').lang, null);
});

test('parseBoard accepts ats:slug and bare names, rejects the rest', () => {
    assert.deepEqual(parseBoard('Lever: spotify'), { input: 'Lever: spotify', ats: 'lever', slug: 'spotify' });
    assert.deepEqual(parseBoard('Stripe'), { input: 'Stripe', ats: 'auto', slug: 'stripe' });
    assert.equal(parseBoard('https://www.linkedin.com/company/x'), null);
    assert.equal(parseBoard('not a board'), null);
    assert.equal(parseBoard('https://nvidia.wd5.myworkdayjobs.com/'), null);
});

test('normalizeInput dedupes boards, keeps invalid values and parses filters', () => {
    const r = normalizeInput({
        companies: ['https://boards.greenhouse.io/airbnb', 'greenhouse:AIRBNB', 'nope nope', { url: 'jobs.ashbyhq.com/ramp' }],
        keywords: ['Engineer'], locations: ['Remote'], postedWithinDays: 7, maxJobsPerCompany: 50,
    });
    assert.equal(r.boards.length, 2);
    assert.deepEqual(r.invalid, ['nope nope']);
    assert.deepEqual(r.keywords, ['engineer']);
    assert.deepEqual(r.locations, ['remote']);
    assert.equal(r.postedWithinDays, 7);
    assert.equal(r.maxJobsPerCompany, 50);
    assert.equal(normalizeInput({ companies: ['x'] }).maxJobsPerCompany, Infinity);
});

test('normalizeInput rejects bad input', () => {
    assert.throws(() => normalizeInput({}), InputError);
    assert.throws(() => normalizeInput({ companies: 'airbnb' }), InputError);
    assert.throws(() => normalizeInput({ companies: ['x'], postedWithinDays: -1 }), InputError);
});
