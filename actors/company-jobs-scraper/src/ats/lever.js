import { fetchJson } from '../http.js';
import { htmlToText, normalizeWorkplace, toIso, uniq, workplaceFromText } from '../text.js';
import { makeJob } from '../job.js';

export function normalizeLeverJob(j, { boardSlug, includeDescription }) {
    const c = j.categories ?? {};
    const sr = j.salaryRange;
    let description;
    if (includeDescription) {
        const parts = [j.descriptionPlain || htmlToText(j.description)];
        for (const l of j.lists ?? []) parts.push(`${l.text}\n${htmlToText(l.content)}`);
        parts.push(j.additionalPlain || htmlToText(j.additional));
        description = parts.filter(Boolean).join('\n\n').trim();
    }
    return makeJob({
        company: boardSlug,
        ats: 'lever',
        boardSlug,
        jobId: j.id,
        title: j.text,
        department: c.department,
        team: c.team,
        location: c.location,
        locations: uniq([c.location, ...(c.allLocations ?? [])]),
        country: j.country,
        workplaceType: normalizeWorkplace(j.workplaceType) ?? workplaceFromText(c.location),
        employmentType: c.commitment,
        salaryMin: sr?.min, salaryMax: sr?.max, salaryCurrency: sr?.currency,
        salaryInterval: sr?.interval ?? null,
        salaryText: j.salaryDescriptionPlain || null,
        postedAt: toIso(j.createdAt),
        url: j.hostedUrl,
        applyUrl: j.applyUrl,
        description,
    });
}

export async function fetchLever(board, { includeDescription, http = fetchJson }) {
    const host = board.region === 'eu' ? 'https://api.eu.lever.co' : 'https://api.lever.co';
    const jobs = [];
    // Lever pages with skip/limit; 100 per page keeps responses small.
    for (let skip = 0; ; skip += 100) {
        const page = await http(`${host}/v0/postings/${encodeURIComponent(board.slug)}?mode=json&skip=${skip}&limit=100`);
        if (!Array.isArray(page)) break;
        jobs.push(...page);
        if (page.length < 100) break;
    }
    return jobs.map((j) => normalizeLeverJob(j, { boardSlug: board.slug, includeDescription }));
}
