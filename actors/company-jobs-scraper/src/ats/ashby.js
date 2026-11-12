import { fetchJson } from '../http.js';
import { htmlToText, normalizeWorkplace, toIso, uniq } from '../text.js';
import { makeJob } from '../job.js';

const INTERVALS = { '1 YEAR': 'year', '1 MONTH': 'month', '1 WEEK': 'week', '1 DAY': 'day', '1 HOUR': 'hour' };

export function normalizeAshbyJob(j, { boardSlug, includeDescription }) {
    const comp = j.compensation;
    const salary = comp?.summaryComponents?.find((c) => c.compensationType === 'Salary')
        ?? comp?.compensationTiers?.flatMap((t) => t.components ?? []).find((c) => c.compensationType === 'Salary');
    const country = j.address?.postalAddress?.addressCountry;
    return makeJob({
        company: boardSlug,
        ats: 'ashby',
        boardSlug,
        jobId: j.id,
        title: j.title,
        department: j.department,
        team: j.team,
        location: j.location,
        locations: uniq([j.location, ...(j.secondaryLocations ?? []).map((l) => l.location)]),
        country,
        workplaceType: normalizeWorkplace(j.workplaceType) ?? (j.isRemote ? 'remote' : null),
        isRemote: j.isRemote === true || normalizeWorkplace(j.workplaceType) === 'remote',
        employmentType: j.employmentType,
        salaryMin: salary?.minValue, salaryMax: salary?.maxValue, salaryCurrency: salary?.currencyCode,
        salaryInterval: salary ? (INTERVALS[salary.interval] ?? salary.interval?.toLowerCase() ?? null) : null,
        salaryText: comp?.scrapeableCompensationSalarySummary || comp?.compensationTierSummary || null,
        postedAt: toIso(j.publishedAt),
        url: j.jobUrl,
        applyUrl: j.applyUrl,
        description: includeDescription ? (j.descriptionPlain || htmlToText(j.descriptionHtml)) : undefined,
    });
}

export async function fetchAshby(board, { includeDescription, http = fetchJson }) {
    const data = await http(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.slug)}?includeCompensation=true`);
    return (data.jobs ?? [])
        .filter((j) => j.isListed !== false)
        .map((j) => normalizeAshbyJob(j, { boardSlug: board.slug, includeDescription }));
}
