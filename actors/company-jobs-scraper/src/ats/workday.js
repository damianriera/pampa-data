import { fetchJson } from '../http.js';
import { htmlToText, uniq, workplaceFromText } from '../text.js';
import { makeJob } from '../job.js';

const PAGE = 20; // Workday's maximum page size
export const WORKDAY_MAX_RESULTS = 2000; // Workday stops paging after 2,000 results per search

/** "Posted Today" -> 0, "Posted 3 Days Ago" -> 3, "Posted 30+ Days Ago" -> 30. Null when unknown. */
export function daysAgoFromPostedOn(text) {
    const t = String(text ?? '').toLowerCase();
    if (t.includes('today')) return 0;
    if (t.includes('yesterday')) return 1;
    const m = t.match(/(\d+)\+?\s*day/);
    return m ? Number(m[1]) : null;
}

export function workdayApiBase(board) {
    return `https://${board.host}/wday/cxs/${encodeURIComponent(board.tenant)}/${encodeURIComponent(board.site)}`;
}

export function normalizeWorkdayJob(listing, detail, { board, includeDescription, now = new Date() }) {
    const info = detail?.jobPostingInfo ?? {};
    const location = info.location ?? listing.locationsText;
    const locations = uniq([info.location, ...(info.additionalLocations ?? [])]);
    let postedAt = info.startDate ? new Date(`${info.startDate}T00:00:00Z`).toISOString() : null;
    if (!postedAt) {
        const days = daysAgoFromPostedOn(listing.postedOn);
        if (days !== null) postedAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days)).toISOString();
    }
    const url = info.externalUrl ?? `https://${board.host}/${board.lang ? `${board.lang}/` : ''}${board.site}${listing.externalPath}`;
    return makeJob({
        company: board.tenant,
        ats: 'workday',
        boardSlug: `${board.tenant}/${board.site}`,
        jobId: info.jobReqId ?? listing.bulletFields?.[0] ?? listing.externalPath,
        title: info.title ?? listing.title,
        location,
        locations: locations.length ? locations : undefined,
        country: info.country?.descriptor,
        workplaceType: workplaceFromText(info.remoteType, location, info.title ?? listing.title),
        employmentType: info.timeType,
        postedAt,
        url,
        applyUrl: `${url}/apply`,
        requisitionId: info.jobReqId ?? listing.bulletFields?.[0],
        description: includeDescription ? htmlToText(info.jobDescription) : undefined,
    });
}

/**
 * Lists a Workday career site, then fetches the detail page of every listing that passes `prefilter`
 * (exact posting date, time type, description). `searchTexts` runs one Workday search per keyword.
 */
export async function fetchWorkday(board, { includeDescription, http = fetchJson, prefilter = () => true, searchTexts = [''], maxJobs = Infinity, concurrency = 5, onWarning = () => {} }) {
    const base = workdayApiBase(board);
    const listings = new Map();
    const wanted = [];
    const add = (postings) => {
        for (const p of postings) {
            if (!p.externalPath || listings.has(p.externalPath)) continue;
            listings.set(p.externalPath, p);
            if (wanted.length < maxJobs && prefilter(p)) wanted.push(p);
        }
    };
    const list = (searchText, offset) => http(`${base}/jobs`, { method: 'POST', body: { appliedFacets: {}, limit: PAGE, offset, searchText } });

    for (const searchText of searchTexts.length ? searchTexts : ['']) {
        if (wanted.length >= maxJobs) break;
        const first = await list(searchText, 0);
        const total = first.total ?? 0; // Workday only reports the total on the first page
        if (total > WORKDAY_MAX_RESULTS) onWarning(`${board.tenant}: Workday lists only the first ${WORKDAY_MAX_RESULTS} of ${total} jobs per search. Add keywords to narrow it.`);
        add(first.jobPostings ?? []);
        // Fetch the remaining pages a few at a time, in order (newest first), until enough jobs are wanted.
        const offsets = [];
        for (let o = PAGE; o < Math.min(total, WORKDAY_MAX_RESULTS); o += PAGE) offsets.push(o);
        for (let i = 0; i < offsets.length && wanted.length < maxJobs; i += concurrency) {
            const pages = await Promise.all(offsets.slice(i, i + concurrency).map((o) => list(searchText, o)));
            for (const page of pages) add(page.jobPostings ?? []);
        }
    }

    const out = new Array(wanted.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, wanted.length) }, async () => {
        while (next < wanted.length) {
            const i = next++;
            const detail = await http(`${base}${wanted[i].externalPath}`).catch(() => null);
            out[i] = normalizeWorkdayJob(wanted[i], detail, { board, includeDescription });
        }
    }));
    out.listed = listings.size; // jobs seen on the board, before the detail step
    return out;
}
