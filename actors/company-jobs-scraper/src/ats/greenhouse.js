import { fetchJson } from '../http.js';
import { decodeEntities, htmlToText, normalizeWorkplace, parseMoneyRange, toIso, uniq, workplaceFromText } from '../text.js';
import { makeJob } from '../job.js';

const API = 'https://boards-api.greenhouse.io/v1/boards';

/** Greenhouse shows published pay ranges as <div class="pay-range"><span>$min</span>...<span>$max CUR</span></div>. */
export function payRangeFromContent(html) {
    const m = html.match(/class="pay-range"[^>]*>([\s\S]*?)<\/div>/);
    if (!m) return null;
    const spans = [...m[1].matchAll(/<span(?![^>]*divider)[^>]*>([^<]*)<\/span>/g)].map((x) => x[1].trim()).filter(Boolean);
    if (!spans.length) return null;
    const r = parseMoneyRange(spans[0], spans[1]);
    return r.min === null ? null : { ...r, text: spans.join(' - ') };
}

export function normalizeGreenhouseJob(j, { boardSlug, companyName, includeDescription }) {
    const html = decodeEntities(j.content ?? '');
    const meta = Object.fromEntries((j.metadata ?? []).map((m) => [String(m.name).toLowerCase(), m.value]));
    const metaValue = (re) => {
        const key = Object.keys(meta).find((k) => re.test(k));
        const v = key ? meta[key] : null;
        return Array.isArray(v) ? v.join(', ') : (typeof v === 'string' ? v : null);
    };
    const location = j.location?.name ?? null;
    const workplaceType = normalizeWorkplace(metaValue(/workplace|remote|location type/)) ?? workplaceFromText(location);
    const pay = payRangeFromContent(html);
    return makeJob({
        company: j.company_name || companyName || boardSlug,
        ats: 'greenhouse',
        boardSlug,
        jobId: j.id,
        title: j.title,
        department: j.departments?.[0]?.name,
        location,
        locations: uniq([location, ...(j.offices ?? []).map((o) => o.location || o.name)]),
        workplaceType,
        employmentType: metaValue(/employment type|time type|job type/),
        salaryMin: pay?.min, salaryMax: pay?.max, salaryCurrency: pay?.currency, salaryText: pay?.text,
        postedAt: toIso(j.first_published ?? j.updated_at),
        updatedAt: toIso(j.updated_at),
        url: j.absolute_url,
        requisitionId: j.requisition_id,
        description: includeDescription ? htmlToText(html) : undefined,
    });
}

export async function fetchGreenhouse(board, { includeDescription, http = fetchJson }) {
    const slug = encodeURIComponent(board.slug);
    const data = await http(`${API}/${slug}/jobs?content=true`);
    let companyName = data.jobs?.[0]?.company_name;
    if (!companyName) companyName = (await http(`${API}/${slug}`).catch(() => null))?.name;
    return (data.jobs ?? []).map((j) => normalizeGreenhouseJob(j, { boardSlug: board.slug, companyName, includeDescription }));
}
