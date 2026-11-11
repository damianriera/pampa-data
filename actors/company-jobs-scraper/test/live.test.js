import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrapeBoard } from '../src/scrape.js';
import { parseBoard } from '../src/input.js';
import { filters } from './helpers.js';

const live = { skip: !process.env.LIVE };

for (const value of ['greenhouse:airbnb', 'https://jobs.lever.co/spotify', 'https://jobs.ashbyhq.com/ramp', 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite']) {
    test(`live: ${value}`, live, async () => {
        const r = await scrapeBoard(parseBoard(value), filters({ maxJobsPerCompany: 3 }));
        assert.ok(r.totalJobs > 0, 'board has jobs');
        assert.ok(r.jobs.length > 0 && r.jobs.every((j) => j.title && j.url));
    });
}
