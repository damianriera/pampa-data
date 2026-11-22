const cleanUrl = (u) => (typeof u === 'string' ? u.replace(/[?&]uo=\d+$/, '') : null);
const num = (v) => {
    const n = Number(v);
    return v == null || v === '' || Number.isNaN(n) ? null : n;
};
const round = (n, d) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);

/** One clean output row from an iTunes Search/Lookup app result. */
export function toApp(r, { country, includeDescription = true, includeScreenshots = true } = {}) {
    const size = num(r.fileSizeBytes);
    const price = num(r.price);
    const row = {
        appId: r.trackId,
        name: r.trackName ?? null,
        bundleId: r.bundleId ?? null,
        url: cleanUrl(r.trackViewUrl),
        platform: r.kind === 'mac-software' ? 'mac' : 'ios',
        developer: r.artistName ?? null,
        developerId: r.artistId ?? null,
        developerUrl: cleanUrl(r.artistViewUrl),
        sellerName: r.sellerName ?? null,
        developerWebsite: r.sellerUrl ?? null,
        price,
        currency: r.currency ?? null,
        formattedPrice: r.formattedPrice ?? null,
        isFree: price === 0,
        rating: round(num(r.averageUserRating), 2),
        ratingCount: num(r.userRatingCount),
        ratingCurrentVersion: round(num(r.averageUserRatingForCurrentVersion), 2),
        ratingCountCurrentVersion: num(r.userRatingCountForCurrentVersion),
        version: r.version ?? null,
        releaseDate: r.releaseDate ?? null,
        currentVersionReleaseDate: r.currentVersionReleaseDate ?? null,
        primaryGenre: r.primaryGenreName ?? null,
        genres: r.genres ?? [],
        contentRating: r.trackContentRating ?? r.contentAdvisoryRating ?? null,
        advisories: r.advisories ?? [],
        minimumOsVersion: r.minimumOsVersion ?? null,
        fileSizeBytes: size,
        fileSizeMB: round(size == null ? null : size / 1048576, 1),
        languages: [...new Set(r.languageCodesISO2A ?? [])],
        supportedDevicesCount: Array.isArray(r.supportedDevices) ? r.supportedDevices.length : null,
        features: r.features ?? [],
        isGameCenterEnabled: Boolean(r.isGameCenterEnabled),
        iconUrl: r.artworkUrl512 ?? r.artworkUrl100 ?? null,
        country,
    };
    if (includeScreenshots) {
        row.screenshotUrls = r.screenshotUrls ?? [];
        row.ipadScreenshotUrls = r.ipadScreenshotUrls ?? [];
    }
    if (includeDescription) {
        row.description = r.description ?? null;
        row.releaseNotes = r.releaseNotes ?? null;
    }
    return row;
}
