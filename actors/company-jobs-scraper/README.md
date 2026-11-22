## Company Jobs Scraper (Greenhouse, Lever, Ashby, Workday)

Get **every open job of any company** straight from its own career page, in one clean table. Paste the career page links of the companies you follow and get title, department, location, remote or hybrid, employment type, **salary range when the company publishes it**, posted date and the apply link.

It reads the official public job board feeds of the four most used applicant tracking systems (ATS): **Greenhouse, Lever, Ashby and Workday**. No login, no browser, no blocked pages, and every company comes out in the same schema, so you can mix Stripe (Greenhouse), Spotify (Lever), Ramp (Ashby) and NVIDIA (Workday) in one run.

Use it to:

- track hiring at competitors, customers or target accounts (hiring signals for sales and investors),
- build a niche job board or job alert from a list of companies,
- research salaries and remote policies across companies,
- feed an AI agent or spreadsheet with fresh roles every day.

### What data you get

| Field | Example | Meaning |
| --- | --- | --- |
| `company` | `Airbnb` | Company name (Greenhouse) or board name (Lever, Ashby, Workday) |
| `title` | `Senior Engineer, Backend` | Job title |
| `department`, `team` | `Engineering`, `Payments` | When the ATS has them |
| `location`, `locations` | `New York, NY` | Main location and every listed location |
| `country` | `US` | When the ATS gives it |
| `workplaceType`, `isRemote` | `hybrid`, `true` | `remote`, `hybrid` or `onsite` as the company marks it |
| `employmentType` | `FullTime` | Full time, part time, contract, intern... as the ATS writes it |
| `salaryMin`, `salaryMax`, `salaryCurrency`, `salaryInterval` | `204000`, `280000`, `USD`, `year` | Only when the company publishes a range |
| `salaryText` | `$204K - $280K` | The range as shown on the job page |
| `postedAt`, `updatedAt` | `2026-11-10T21:13:22.545Z` | When the job was first published |
| `url`, `applyUrl` | `https://jobs.ashbyhq.com/ramp/...` | Job page and application link |
| `jobId`, `requisitionId` | `JR2029595` | Stable ids for de-duplication |
| `ats`, `boardSlug` | `ashby`, `ramp` | Where the job came from |
| `description` | `About Ramp...` | Plain-text description, optional |

Recruiter names and contact details are never collected.

### How to use it

1. Open the company's careers page, click any job, and copy the address bar. Links like these all work:
   - `https://boards.greenhouse.io/airbnb` or `https://job-boards.greenhouse.io/stripe`
   - `https://jobs.lever.co/spotify`
   - `https://jobs.ashbyhq.com/ramp`
   - `https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite`
2. Or just type the board name (`stripe`): it is tried on Greenhouse, Lever and Ashby. `greenhouse:stripe` skips the guessing.
3. Add filters if you want: title keywords, words to exclude, locations, remote only, posted in the last N days.
4. Run it and export to JSON, CSV or Excel, or call it from the API, Make, Zapier or n8n. Schedule it daily with **Posted within the last 1 day** to get only new jobs.

Example input:

```json
{
    "companies": ["https://boards.greenhouse.io/airbnb", "https://jobs.lever.co/spotify", "jobs.ashbyhq.com/ramp", "stripe"],
    "keywords": ["engineer", "data"],
    "excludeKeywords": ["intern"],
    "locations": ["Remote", "New York"],
    "postedWithinDays": 7
}
```

After the run, the `SUMMARY` record shows which ATS each company uses, how many jobs it lists and how many were saved, and `FAILED` lists the inputs that were not found.

### Pricing

**$0.001 per job, which is $1 per 1,000 jobs**, with no subscription. A daily run over 50 companies with a "posted in the last 1 day" filter usually returns a few dozen new jobs, so it costs cents per day, and Apify's free plan credit of $5 a month covers about 5,000 jobs.

You pay per job in the results. Jobs removed by your filters are not charged, and neither are companies that were not found. Set a maximum cost per run in Apify and the Actor stops cleanly when it is reached; use **Max jobs per company** to cap large employers.

### Speed

Greenhouse, Lever and Ashby return a whole company in one or a few requests, so a hundred companies take about a minute. Workday needs one request per job for the exact posting date and details, so big Workday employers take longer; title keywords are sent to Workday's own search to keep that fast.

### Limits

- Only companies that use Greenhouse, Lever, Ashby or Workday with a public career page. Custom career sites are skipped (listed in `FAILED`).
- Workday search shows at most 2,000 jobs per search; for bigger employers add title keywords.
- Salary appears only when the company publishes it (common for US, UK and Canada jobs).
- For a bare board name the company name in results is the board name (`spotify`); Greenhouse returns the real company name.

### FAQ

**How do I know which ATS a company uses?** You do not need to. Paste the careers page link or just the company's board name (`stripe`) and the Actor tries Greenhouse, Lever and Ashby for you. The `SUMMARY` record tells you which one matched. Workday career sites have `myworkdayjobs.com` in the link.

**Can I get only new jobs every day?** Yes. Schedule the Actor daily in Apify with **Posted within the last 1 day**, and send the results to Google Sheets, Slack, email or a webhook with Apify integrations, Make, Zapier or n8n.

**Is it a LinkedIn or Indeed scraper?** No. It reads the companies' own job boards, which are the source those sites copy from. That means jobs show up here first, with the original apply link and the salary range the company published, and without login walls or blocked requests.

**Can I use it for sales leads?** Yes, as hiring signals: a company that opens five data engineering roles is likely buying data tools. The Actor returns company and job data only; it never collects recruiter or employee names.

### Related Actors

- [Website Popularity Rank Checker](https://apify.com/pampa-data/website-popularity-rank): popularity rank and trend of the companies' websites, to size the employers you track.
- [Google Trends Scraper](https://apify.com/pampa-data/google-trends-scraper): search interest for companies, roles or skills over time.
- [Keyword Suggestions Scraper](https://apify.com/pampa-data/keyword-suggestions-scraper): what people search about a company, role or skill, from Google, YouTube and Bing autocomplete.
