// Minimal robots.txt parser following Google's rules: the most specific user-agent group wins, then the longest
// matching rule; Allow wins a tie. Supports * and $ in paths.

export function parseRobots(text = '') {
    const groups = [];
    const sitemaps = [];
    let current = null;
    let lastWasAgent = false;
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.replace(/#.*$/, '').trim();
        const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
        if (!m) continue;
        const key = m[1].toLowerCase();
        const value = m[2].trim();
        if (key === 'sitemap') {
            if (value) sitemaps.push(value);
            continue;
        }
        if (key === 'user-agent') {
            if (!lastWasAgent || !current) {
                current = { agents: [], rules: [] };
                groups.push(current);
            }
            current.agents.push(value.toLowerCase());
            lastWasAgent = true;
            continue;
        }
        lastWasAgent = false;
        if (!current) continue;
        if (key === 'allow' || key === 'disallow') current.rules.push({ allow: key === 'allow', path: value });
    }
    return { groups, sitemaps };
}

function ruleMatches(pattern, path) {
    if (!pattern) return false;
    let re = '';
    for (const ch of pattern) {
        if (ch === '*') re += '.*';
        else if (ch === '$') re += '$';
        else re += ch.replace(/[.+?^{}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(`^${re}`).test(path);
}

/** Rules that apply to a crawler: the group naming it most specifically, else the `*` group. */
export function rulesFor(robots, agent) {
    const name = agent.toLowerCase();
    let best = null;
    let bestLen = -1;
    for (const g of robots.groups) {
        for (const a of g.agents) {
            if (a !== '*' && name.includes(a) && a.length > bestLen) {
                best = a;
                bestLen = a.length;
            }
        }
    }
    const wanted = best ?? '*';
    return robots.groups.filter((g) => g.agents.includes(wanted)).flatMap((g) => g.rules);
}

/** Whether `agent` may fetch the URL's path and query. */
export function isAllowed(robots, url, agent = 'googlebot') {
    const u = new URL(url);
    let path = u.pathname + u.search;
    try {
        path = decodeURI(path);
    } catch { /* keep raw */ }
    let verdict = true;
    let length = -1;
    for (const rule of rulesFor(robots, agent)) {
        let rulePath = rule.path;
        try {
            rulePath = decodeURI(rulePath);
        } catch { /* keep raw */ }
        if (!ruleMatches(rulePath, path)) continue;
        const len = rulePath.length;
        if (len > length || (len === length && rule.allow)) {
            verdict = rule.allow;
            length = len;
        }
    }
    return verdict;
}
