/** Every Actor result has the same keys in the same order, whichever ATS it came from. */
export function makeJob(f) {
    const locations = f.locations?.length ? f.locations : (f.location ? [f.location] : []);
    const workplaceType = f.workplaceType ?? null;
    return {
        company: f.company ?? null,
        ats: f.ats,
        boardSlug: f.boardSlug,
        jobId: f.jobId != null ? String(f.jobId) : null,
        title: f.title?.trim() ?? null,
        department: f.department || null,
        team: f.team || null,
        location: f.location || locations[0] || null,
        locations,
        country: f.country || null,
        workplaceType,
        isRemote: f.isRemote ?? workplaceType === 'remote',
        employmentType: f.employmentType || null,
        salaryMin: f.salaryMin ?? null,
        salaryMax: f.salaryMax ?? null,
        salaryCurrency: f.salaryCurrency ?? null,
        salaryInterval: f.salaryInterval ?? null,
        salaryText: f.salaryText ?? null,
        postedAt: f.postedAt ?? null,
        updatedAt: f.updatedAt ?? null,
        url: f.url ?? null,
        applyUrl: f.applyUrl ?? f.url ?? null,
        requisitionId: f.requisitionId || null,
        description: f.description,
    };
}
