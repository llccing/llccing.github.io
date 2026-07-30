/**
 * Source fetchers for the daily digest.
 *
 * Everything here returns items whose `url` came from the upstream feed, never
 * from a model. That is the whole point of fetching first: the digest can link to
 * real pages instead of plausible-looking invented ones.
 */

import { XMLParser } from "fast-xml-parser";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "rowanliu-blog-digest";

/** Feeds are verbose; the model only needs enough to judge relevance. */
const SUMMARY_LIMIT = 1200;

/** Release-candidate style suffixes, for sources that omit the prerelease flag. */
const PRERELEASE_TAG = /-(rc|beta|alpha|next|canary|nightly|dev|pre)[.\d-]*$/i;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function truncate(text, limit = SUMMARY_LIMIT) {
  if (typeof text !== "string") return "";
  const clean = text
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

/** fast-xml-parser collapses single-element lists into a bare object. */
function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

async function fetchText(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function fetchGithubReleases(source) {
  const headers = { accept: "application/vnd.github+json" };
  // CI provides GITHUB_TOKEN, which lifts the 60 req/h anonymous rate limit.
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const url = `https://api.github.com/repos/${source.repo}/releases?per_page=15`;
  const releases = JSON.parse(await fetchText(url, headers));

  return releases
    .filter(r => !r.draft)
    .map(r => ({
      id: r.html_url,
      url: r.html_url,
      // Filters match against the upstream tag, not the display title, so a
      // rule like /^ai@\d/ can target monorepo package tags precisely.
      rawName: r.tag_name || r.name || "",
      title: `${source.repo} ${r.name || r.tag_name}`.trim(),
      publishedAt: r.published_at || r.created_at || null,
      summary: truncate(r.body),
      // Maintainers sometimes forget the flag, so fall back to the tag suffix.
      isPrerelease:
        Boolean(r.prerelease) || PRERELEASE_TAG.test(r.tag_name || ""),
    }));
}

function normalizeRssItem(entry) {
  // Atom stores the target in link/@_href; RSS uses link's text content.
  const rawLink = entry.link;
  let url = "";
  if (typeof rawLink === "string") {
    url = rawLink;
  } else if (Array.isArray(rawLink)) {
    const alt = rawLink.find(l => l?.["@_rel"] === "alternate") || rawLink[0];
    url = alt?.["@_href"] || alt?.["#text"] || "";
  } else if (rawLink && typeof rawLink === "object") {
    url = rawLink["@_href"] || rawLink["#text"] || "";
  }
  if (!url && typeof entry.guid === "string") url = entry.guid;
  if (!url && entry.guid?.["#text"]) url = entry.guid["#text"];

  const title =
    typeof entry.title === "string"
      ? entry.title
      : entry.title?.["#text"] || "(untitled)";

  const published =
    entry.pubDate || entry.published || entry.updated || entry["dc:date"] || null;

  const body =
    entry.description ||
    entry.summary?.["#text"] ||
    entry.summary ||
    entry.content?.["#text"] ||
    entry.content ||
    "";

  return {
    id: url,
    url,
    // A feed has no tag, so filters match against the headline.
    rawName: String(title).trim(),
    title: String(title).trim(),
    publishedAt: published ? String(published) : null,
    summary: truncate(typeof body === "string" ? body : ""),
    isPrerelease: false,
  };
}

/**
 * Content-level filtering: prereleases, and the include/exclude rules a source
 * declares to keep monorepo package churn and low-signal posts out.
 *
 * Deliberately not where per-source caps are applied — a cap has to run after
 * deduplication, otherwise already-published items fill the quota and squeeze
 * out the genuinely new ones behind them.
 */
function passesFilters(item, source) {
  if (item.isPrerelease && !source.prereleases) return false;
  if (source.include && !source.include.test(item.rawName)) return false;
  if (source.exclude && source.exclude.test(item.rawName)) return false;
  return true;
}

async function fetchRss(source) {
  const parsed = parser.parse(await fetchText(source.url));
  const entries = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
  return asArray(entries)
    .map(normalizeRssItem)
    .filter(item => item.url);
}

async function fetchSource(source) {
  const items =
    source.type === "github-releases"
      ? await fetchGithubReleases(source)
      : await fetchRss(source);

  // Carry the source's own limits onto each item so the later dedup and cap
  // stages can honour them without needing the registry again.
  return items.filter(item => passesFilters(item, source)).map(item => ({
    ...item,
    sourceId: source.id,
    sourceLabel: source.label,
    domain: source.domain,
    maxPerRun: source.maxPerRun,
    lookbackDays: source.lookbackDays,
  }));
}

/**
 * Fetch every source concurrently. A failing source is reported and skipped:
 * feed URLs rot, and one dead feed should not cost the whole day's digest.
 */
export async function fetchAll(sources) {
  const settled = await Promise.all(
    sources.map(async source => {
      try {
        return { source, items: await fetchSource(source) };
      } catch (err) {
        return { source, error: err };
      }
    })
  );

  const items = [];
  const failures = [];
  for (const result of settled) {
    if (result.error) {
      failures.push({ id: result.source.id, message: result.error.message });
      continue;
    }
    items.push(...result.items);
  }
  return { items, failures };
}

export { fetchSource, truncate };
