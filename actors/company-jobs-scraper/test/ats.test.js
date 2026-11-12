import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.js';
import { fetchGreenhouse, payRangeFromContent } from '../src/ats/greenhouse.js';
import { fetchLever } from '../src/ats/lever.js';
import { fetchAshby } from '../src/ats/ashby.js';
import { daysAgoFromPostedOn, fetchWorkday, workdayApiBase } from '../src/ats/workday.js';

const KEYS = ['company', 'ats', 'boardSlug', 'jobId', 'title', 'department', 'team', 'location', 'locations', 'country', 'workplaceType', 'isRemote', 'employmentType', 'salaryMin', 'salaryMax', 'salaryCurrency', 'salaryInterval', 'salaryText', 'postedAt', 'updatedAt', 'url', 'applyUrl', 'requisitionId', 'description'];

test('Greenhouse jobs are normalized with pay range and workplace type', async () => {
    const urls = [];
    const http = async (url) => { urls.push(url); return fixture('greenhouse_jobs.json'); };
    const jobs = await fetchGreenhouse({ ats: 'greenhouse', slug: 'airbnb' }, { includeDescription: true, http });
    assert.equal(urls[0], 'https://boards-api.greenhouse.io/v1/boards/airbnb/jobs?content=true');
    assert.equal(jobs.length, 3);
    const j = jobs[0];
    assert.deepEqual(Object.keys(j), KEYS);
    assert.equal(j.company, 'Airbnb');
    assert.equal(j.ats, 'greenhouse');
    assert.ok(j.title && j.url.startsWith('https://'));
    assert.ok(typeof j.salaryMin === 'number' && j.salaryMax >= j.salaryMin && j.salaryCurrency);
    assert.ok(['remote', 'hybrid', 'onsite', null].includes(j.workplaceType));
    assert.ok(j.postedAt.endsWith('Z'));
    assert.ok(j.description.length > 200 && !j.description.includes('<'));
    assert.equal(jobs[2].salaryMin, null);
});

test('payRangeFromContent reads Greenhouse pay ranges', () => {
    const r = payRangeFromContent('<div class="pay-range"><span>$140,000</span><span class="divider">&mdash;</span><span>$200,000 USD</span></div>');
    assert.deepEqual(r, { min: 140000, max: 200000, currency: 'USD', text: '$140,000 - $200,000 USD' });
    assert.equal(payRangeFromContent('<p>no pay</p>'), null);
});

test('Lever postings are normalized and paged', async () => {
    const urls = [];
    const http = async (url) => { urls.push(url); return fixture('lever_postings.json'); };
    const jobs = await fetchLever({ ats: 'lever', slug: 'spotify', region: 'global' }, { includeDescription: true, http });
    assert.equal(urls.length, 1);
    assert.match(urls[0], /^https:\/\/api\.lever\.co\/v0\/postings\/spotify\?mode=json&skip=0&limit=100$/);
    const j = jobs[0];
    assert.deepEqual(Object.keys(j), KEYS);
    assert.equal(j.ats, 'lever');
    assert.equal(j.title, 'Account Executive - Commercial, Spotify Technology');
    assert.equal(j.workplaceType, 'hybrid');
    assert.equal(j.employmentType, 'Permanent');
    assert.equal(j.country, 'US');
    assert.ok(j.postedAt.startsWith('2026-'));
    assert.match(j.description, /What You'll Do/);
    assert.equal((await fetchLever({ slug: 'x', region: 'eu' }, { http: async (u) => { urls.push(u); return []; } })).length, 0);
    assert.match(urls.at(-1), /^https:\/\/api\.eu\.lever\.co\//);
});

test('Ashby jobs are normalized with structured compensation', async () => {
    const jobs = await fetchAshby({ ats: 'ashby', slug: 'ramp' }, { includeDescription: false, http: async () => fixture('ashby_board.json') });
    const j = jobs[0];
    assert.deepEqual(Object.keys(j), KEYS);
    assert.equal(j.title, 'Security Engineer, Cloud');
    assert.equal(j.salaryMin, 211400);
    assert.equal(j.salaryMax, 290600);
    assert.equal(j.salaryCurrency, 'USD');
    assert.equal(j.salaryInterval, 'year');
    assert.equal(j.workplaceType, 'hybrid');
    assert.equal(j.isRemote, true);
    assert.ok(j.locations.includes('Remote (US)'));
    assert.equal(j.description, undefined);
});

test('Workday listing plus detail gives exact dates; prefilter skips detail calls', async () => {
    const calls = [];
    const http = async (url, opts) => {
        calls.push([url, opts?.body?.offset]);
        return url.endsWith('/jobs') ? fixture('workday_jobs.json') : fixture('workday_job_detail.json');
    };
    const board = { ats: 'workday', host: 'nvidia.wd5.myworkdayjobs.com', tenant: 'nvidia', site: 'NVIDIAExternalCareerSite', lang: null, slug: 'nvidia/NVIDIAExternalCareerSite' };
    const jobs = await fetchWorkday(board, { includeDescription: true, http, prefilter: (l) => l.title.includes('Program'), concurrency: 2 });
    // The fixture page has 3 postings (< 20), so one list call; 2 titles contain "Program".
    assert.equal(calls.filter(([u]) => u.endsWith('/jobs')).length, 1);
    assert.equal(jobs.length, 2);
    const j = jobs[0];
    assert.deepEqual(Object.keys(j), KEYS);
    assert.equal(j.requisitionId, 'JR2029595');
    assert.equal(j.postedAt, '2026-11-11T00:00:00.000Z');
    assert.equal(j.employmentType, 'Full time');
    assert.equal(j.country, 'Taiwan');
    assert.match(j.applyUrl, /\/apply$/);
    assert.ok(j.description.length > 100);
    assert.equal(workdayApiBase(board), 'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite');
});

test('Workday stops paging at 2,000 results and warns', async () => {
    let lists = 0;
    const warnings = [];
    const page = { total: 5000, jobPostings: Array.from({ length: 20 }, (_, i) => ({ title: 't', externalPath: `/job/x_${i}` })) };
    const http = async (url, opts) => {
        if (url.endsWith('/jobs')) {
            lists++;
            return { ...page, jobPostings: page.jobPostings.map((p) => ({ ...p, externalPath: `${p.externalPath}_${opts.body.offset}` })) };
        }
        return null;
    };
    const board = { host: 'a.wd1.myworkdayjobs.com', tenant: 'a', site: 'S' };
    const jobs = await fetchWorkday(board, { http, prefilter: () => false, onWarning: (m) => warnings.push(m) });
    assert.equal(lists, 100);
    assert.equal(jobs.length, 0);
    assert.equal(warnings.length, 1);
});

test('daysAgoFromPostedOn', () => {
    assert.equal(daysAgoFromPostedOn('Posted Today'), 0);
    assert.equal(daysAgoFromPostedOn('Posted Yesterday'), 1);
    assert.equal(daysAgoFromPostedOn('Posted 6 Days Ago'), 6);
    assert.equal(daysAgoFromPostedOn('Posted 30+ Days Ago'), 30);
    assert.equal(daysAgoFromPostedOn(undefined), null);
});
