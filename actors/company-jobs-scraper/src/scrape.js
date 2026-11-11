import { HttpError, fetchJson } from './http.js';
import { jobMatches, locationMatches, titleMatches } from './filters.js';
import { fetchAshby } from './ats/ashby.js';
import { fetchGreenhouse } from './ats/greenhouse.js';
import { fetchLever } from './ats/lever.js';
import { daysAgoFromPostedOn, fetchWorkday } from './ats/workday.js';

const FETCHERS = { greenhouse: fetchGreenhouse, lever: fetchLever, ashby: fetchAshby };
const AUTO_ORDER = ['greenhouse', 'lever', 'ashby'];

export class BoardNotFoundError extends Error {}

function workdayPrefilter(filters) {
    return (listing) => {
        if (!titleMatches(listing.title, filters)) return false;
        // "3 Locations" says nothing about where; leave those for the detail check.
        const text = listing.locationsText ?? '';
        if (filters.locations.length && !/^\d+ locations?$/i.test(text) && !/remote/i.test(text) && !locationMatches([text], filters.locations)) return false;
        if (filters.postedWithinDays) {
            const days = daysAgoFromPostedOn(listing.postedOn);
            // "Posted 30+ Days Ago" reads as 30, which is still a lower bound.
            if (days !== null && days >= filters.postedWithinDays) return false;
        }
        return true;
    };
}

/**
 * Fetches one board and returns { board, jobs } with the user's filters and per-company limit applied.
 * A bare company name is tried on Greenhouse, then Lever, then Ashby.
 */
export async function scrapeBoard(board, filters, { http = fetchJson, onWarning = () => {} } = {}) {
    let jobs;
    let resolved = board;
    if (board.ats === 'workday') {
        jobs = await fetchWorkday(board, {
            includeDescription: filters.includeDescription,
            http,
            prefilter: workdayPrefilter(filters),
            // Workday search is server-side and matches more than titles; the title filter still applies afterwards.
            searchTexts: filters.keywords.length && filters.keywords.length <= 5 ? filters.keywords : [''],
            maxJobs: filters.remoteOnly || filters.locations.length ? Infinity : filters.maxJobsPerCompany,
            onWarning,
        });
    } else if (board.ats === 'auto') {
        for (const ats of AUTO_ORDER) {
            try {
                jobs = await FETCHERS[ats]({ ...board, ats }, { includeDescription: filters.includeDescription, http });
                resolved = { ...board, ats };
                break;
            } catch (err) {
                if (!(err instanceof HttpError && err.status === 404)) throw err;
            }
        }
        if (!jobs) throw new BoardNotFoundError(`No public Greenhouse, Lever or Ashby board named "${board.slug}". Paste the career page URL instead.`);
    } else {
        try {
            jobs = await FETCHERS[board.ats](board, { includeDescription: filters.includeDescription, http });
        } catch (err) {
            if (err instanceof HttpError && err.status === 404) throw new BoardNotFoundError(`No public ${board.ats} board "${board.slug}".`);
            throw err;
        }
    }
    const now = Date.now();
    const matched = jobs.filter((j) => jobMatches(j, filters, now));
    matched.sort((a, b) => String(b.postedAt ?? '').localeCompare(String(a.postedAt ?? '')));
    return { board: resolved, totalJobs: jobs.listed ?? jobs.length, jobs: matched.slice(0, filters.maxJobsPerCompany) };
}
