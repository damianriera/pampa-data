const DAY = 86400000;

export function titleMatches(title, { keywords, excludeKeywords }) {
    const t = String(title ?? '').toLowerCase();
    if (keywords.length && !keywords.some((k) => t.includes(k))) return false;
    return !excludeKeywords.some((k) => t.includes(k));
}

export function locationMatches(locations, wanted) {
    if (!wanted.length) return true;
    const text = locations.filter(Boolean).join(' | ').toLowerCase();
    return wanted.some((w) => text.includes(w));
}

/** True when a normalized job passes all the user's filters. */
export function jobMatches(job, filters, now = Date.now()) {
    if (!titleMatches(job.title, filters)) return false;
    if (!locationMatches([job.location, ...job.locations, job.country], filters.locations)) return false;
    if (filters.remoteOnly && !job.isRemote) return false;
    if (filters.postedWithinDays) {
        if (!job.postedAt) return false;
        // Compare by calendar day so "posted today" counts for postedWithinDays = 1.
        const ageDays = Math.floor((now - Date.parse(job.postedAt)) / DAY);
        if (ageDays >= filters.postedWithinDays) return false;
    }
    return true;
}
