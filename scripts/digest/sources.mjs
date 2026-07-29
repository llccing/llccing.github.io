/**
 * Digest source registry.
 *
 * Every source declares which domain it feeds. The four domains here are the
 * authority for the script side; src/content/config.ts declares the same set for
 * the Astro schema and the two must stay in sync.
 *
 * Supported types:
 *   github-releases — GitHub Releases JSON API. Stable and needs no parsing.
 *   rss             — RSS or Atom feed.
 *
 * A source that fails to fetch is skipped with a warning rather than failing the
 * whole run, so one dead feed never blocks the daily digest.
 *
 * Noise control, applied per source in fetch.mjs:
 *   include        — regex; keep only items whose raw name matches.
 *   exclude        — regex; drop items whose raw name matches.
 *   prereleases    — keep -rc / -beta / -alpha builds. Off unless set.
 *   maxPerRun      — cap after filtering. Monorepos and link blogs publish far
 *                    more per day than a digest can carry.
 *   lookbackDays   — how far back this source stays eligible.
 *
 * "Raw name" is the release tag for GitHub sources and the entry title for RSS,
 * i.e. the upstream string before this script reformats it for display.
 *
 * On lookback: URL dedup is permanent, so a wide window never causes a repeat —
 * it only decides how much history a brand-new feed may contribute on its first
 * run. Release feeds therefore get a wide window (framework releases are weekly,
 * and a digest that only looks back 3 days reports nothing on most days) while
 * high-volume blogs get a narrow one.
 */

export const DOMAINS = ["angular", "web", "ai", "fullstack"];

export const DOMAIN_LABELS = {
  angular: "Angular",
  web: "Web / 框架",
  ai: "AI",
  fullstack: "全栈 / 运行时",
};

/** No single domain may crowd out the rest, however busy its feeds are. */
export const MAX_PER_DOMAIN = 10;

export const SOURCES = [
  // --- angular ------------------------------------------------------------
  {
    id: "angular-releases",
    domain: "angular",
    label: "Angular releases",
    type: "github-releases",
    repo: "angular/angular",
    // Prereleases stay: tracking what lands in the next minor before it ships is
    // the point of following Angular this closely.
    prereleases: true,
    lookbackDays: 14,
    maxPerRun: 4,
  },
  {
    id: "angular-blog",
    domain: "angular",
    label: "Angular blog",
    type: "rss",
    url: "https://blog.angular.dev/feed",
    // Posts land every few weeks; a narrow window would report nothing at all.
    lookbackDays: 21,
    maxPerRun: 3,
  },

  // --- web ----------------------------------------------------------------
  {
    id: "vue-core-releases",
    domain: "web",
    label: "Vue core releases",
    type: "github-releases",
    repo: "vuejs/core",
    // A major like 3.6 spends months in rc; excluding them hides the whole story.
    prereleases: true,
    lookbackDays: 14,
    maxPerRun: 3,
  },
  {
    id: "react-releases",
    domain: "web",
    label: "React releases",
    type: "github-releases",
    repo: "facebook/react",
    lookbackDays: 14,
    maxPerRun: 3,
  },
  {
    id: "vite-releases",
    domain: "web",
    label: "Vite releases",
    type: "github-releases",
    repo: "vitejs/vite",
    // Drop plugin subpackage tags such as plugin-legacy@8.2.2; keep vX.Y.Z.
    include: /^v\d/,
    prereleases: true,
    lookbackDays: 14,
    maxPerRun: 3,
  },
  {
    id: "chrome-blog",
    domain: "web",
    label: "Chrome for Developers",
    type: "rss",
    url: "https://developer.chrome.com/static/blog/feed.xml",
    lookbackDays: 7,
    maxPerRun: 3,
  },

  // --- ai -----------------------------------------------------------------
  {
    id: "openai-news",
    domain: "ai",
    label: "OpenAI news",
    type: "rss",
    url: "https://openai.com/news/rss.xml",
    // Mostly corporate and customer-story posts; keep a couple, not the feed.
    lookbackDays: 5,
    maxPerRun: 2,
  },
  {
    id: "simon-willison",
    domain: "ai",
    label: "Simon Willison",
    type: "rss",
    url: "https://simonwillison.net/atom/everything/",
    // A link blog: quote reposts and photo sightings are not digest material.
    exclude: /^(Quoting |Sighting )/i,
    lookbackDays: 3,
    maxPerRun: 3,
  },
  {
    id: "vercel-ai-sdk-releases",
    domain: "ai",
    label: "Vercel AI SDK releases",
    type: "github-releases",
    repo: "vercel/ai",
    // Monorepo: dozens of @ai-sdk/* subpackage tags a day. Only the main
    // `ai@X.Y.Z` package release is worth reporting.
    include: /^ai@\d/,
    lookbackDays: 7,
    maxPerRun: 2,
  },

  // --- fullstack ----------------------------------------------------------
  {
    id: "node-releases",
    domain: "fullstack",
    label: "Node.js releases",
    type: "github-releases",
    repo: "nodejs/node",
    lookbackDays: 14,
    maxPerRun: 3,
  },
  {
    id: "bun-releases",
    domain: "fullstack",
    label: "Bun releases",
    type: "github-releases",
    repo: "oven-sh/bun",
    lookbackDays: 14,
    maxPerRun: 2,
  },
  {
    id: "cloudflare-blog",
    domain: "fullstack",
    label: "Cloudflare blog",
    type: "rss",
    url: "https://blog.cloudflare.com/rss/",
    lookbackDays: 4,
    maxPerRun: 2,
  },
  {
    id: "infoq-java",
    domain: "fullstack",
    label: "InfoQ Java",
    type: "rss",
    url: "https://feed.infoq.com/java/",
    // Conference talk and article promos outnumber actual Java news.
    exclude: /^(Presentation|Podcast|Article):/i,
    lookbackDays: 10,
    maxPerRun: 2,
  },
];

export function sourceById(id) {
  return SOURCES.find(s => s.id === id);
}
