// Turns a parsed item into the dataset row users get.

function truncate(text, max) {
    if (!text || max === 0) return max === 0 ? null : text;
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const space = cut.lastIndexOf(' ');
    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export function toRow(item, { feed, feedUrl, source, matchedKeywords, content, summaryMaxLength }) {
    const row = {
        title: item.title,
        link: item.link,
        published: item.published,
        updated: item.updated,
        author: item.author,
        categories: item.categories,
        summary: truncate(item.summary, summaryMaxLength),
    };
    if (content === 'text') row.content = item.contentText;
    if (content === 'html') row.content = item.contentHtml;
    Object.assign(row, {
        image: item.image,
        enclosureUrl: item.enclosureUrl,
        enclosureType: item.enclosureType,
        enclosureLengthBytes: item.enclosureLengthBytes,
        durationSeconds: item.durationSeconds,
        commentsUrl: item.commentsUrl,
        guid: item.guid,
        matchedKeywords,
        feedTitle: feed.title,
        feedLink: feed.link,
        feedUrl,
        feedType: feed.feedType,
        feedLanguage: feed.language,
        source,
    });
    return row;
}
