import { XMLParser } from "fast-xml-parser";
import { DOMAIN_LABELS, MAX_PER_DOMAIN, SOURCES } from "./sources";
import type { DigestItem, DigestSource, SourceFailure } from "./types";

const TIMEOUT_MS = 20_000;
const USER_AGENT = "rowanliu-blog-digest-worker";
const PRERELEASE_TAG = /-(rc|beta|alpha|next|canary|nightly|dev|pre)[.\d-]*$/i;
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Feeds can contain large HTML fragments with thousands of entities. They
  // are discarded by truncate() and must not be expanded by the XML parser.
  processEntities: false,
});

function truncate(text: unknown, limit = 1200): string {
  if (typeof text !== "string") return "";
  const clean = text.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

async function fetchText(url: string, headers: Record<string, string>): Promise<string> {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT, ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status} ${response.statusText}`), {
      status: response.status,
      retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
    });
  }
  return response.text();
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(timestamp - now, 0) : undefined;
}

function isRetryable(error: unknown): boolean {
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
  return !status || status === 408 || status === 429 || status >= 500;
}

async function withRetries<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      if (attempt === 2 || !isRetryable(error)) throw error;
      const retryAfterMs =
        typeof error === "object" && error && "retryAfterMs" in error
          ? Number(error.retryAfterMs)
          : 0;
      const delay = Math.min(Math.max(retryAfterMs || 0, [10_000, 30_000][attempt]), 90_000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function normalizeRssItem(entry: Record<string, any>) {
  const rawLink = entry.link;
  let url = "";
  if (typeof rawLink === "string") url = rawLink;
  else if (Array.isArray(rawLink)) {
    const alt = rawLink.find(item => item?.["@_rel"] === "alternate") || rawLink[0];
    url = alt?.["@_href"] || alt?.["#text"] || "";
  } else if (rawLink && typeof rawLink === "object") url = rawLink["@_href"] || rawLink["#text"] || "";
  if (!url && typeof entry.guid === "string") url = entry.guid;
  if (!url && entry.guid?.["#text"]) url = entry.guid["#text"];
  const title = typeof entry.title === "string" ? entry.title : entry.title?.["#text"] || "(untitled)";
  const publishedAt = entry.pubDate || entry.published || entry.updated || entry["dc:date"] || null;
  const body = entry.description || entry.summary?.["#text"] || entry.summary || entry.content?.["#text"] || entry.content || "";
  return { id: url, url, rawName: String(title).trim(), title: String(title).trim(), publishedAt: publishedAt ? String(publishedAt) : null, summary: truncate(body), isPrerelease: false };
}

function passesFilters(item: { rawName: string; isPrerelease: boolean }, source: DigestSource): boolean {
  if (item.isPrerelease && !source.prereleases) return false;
  if (source.include && !new RegExp(source.include).test(item.rawName)) return false;
  if (source.exclude && new RegExp(source.exclude).test(item.rawName)) return false;
  return true;
}

async function fetchSource(source: DigestSource, githubToken: string): Promise<DigestItem[]> {
  let items: Array<any>;
  if (source.type === "github-releases") {
    const headers: Record<string, string> = { accept: "application/vnd.github+json" };
    if (githubToken) headers.authorization = `Bearer ${githubToken}`;
    const releases = JSON.parse(await fetchText(`https://api.github.com/repos/${source.repo}/releases?per_page=15`, headers));
    items = releases.filter((release: any) => !release.draft).map((release: any) => ({
      id: release.html_url, url: release.html_url, rawName: release.tag_name || release.name || "",
      title: `${source.repo} ${release.name || release.tag_name}`.trim(), publishedAt: release.published_at || release.created_at || null,
      summary: truncate(release.body), isPrerelease: Boolean(release.prerelease) || PRERELEASE_TAG.test(release.tag_name || ""),
    }));
  } else {
    const parsed = parseRssText(await fetchText(source.url!, {}));
    const entries = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
    items = asArray(entries).map(entry => normalizeRssItem(entry)).filter(item => item.url);
  }
  return items.filter(item => passesFilters(item, source)).map(item => ({ ...item, sourceId: source.id, sourceLabel: source.label, domain: source.domain, maxPerRun: source.maxPerRun, lookbackDays: source.lookbackDays }));
}

export function parseRssText(text: string): Record<string, any> {
  return parser.parse(text) as Record<string, any>;
}

async function parallelLimit<T>(values: T[], limit: number, operation: (value: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (next < values.length) { const index = next++; await operation(values[index]); }
  }));
}

export async function fetchOneSource(source: DigestSource, githubToken: string): Promise<DigestItem[]> {
  return withRetries(() => fetchSource(source, githubToken));
}

export async function fetchAll(githubToken: string): Promise<{ items: DigestItem[]; failures: SourceFailure[] }> {
  const items: DigestItem[] = [];
  const failures: SourceFailure[] = [];
  await parallelLimit(SOURCES, 5, async source => {
    try { items.push(...await fetchOneSource(source, githubToken)); }
    catch (error) {
      const status = typeof error === "object" && error && "status" in error ? Number(error.status) : undefined;
      failures.push({ id: source.id, message: error instanceof Error ? error.message : String(error), status });
    }
  });
  return { items, failures };
}

export function filterAndCap(items: DigestItem[], seenUrls: string[]): DigestItem[] {
  const seen = new Set(seenUrls);
  const batchSeen = new Set<string>();
  const now = Date.now();
  const candidates = items.filter(item => {
    if (!item.url || seen.has(item.url) || batchSeen.has(item.url)) return false;
    if (item.publishedAt) {
      const ts = new Date(item.publishedAt).getTime();
      if (Number.isFinite(ts) && ts < now - (item.lookbackDays ?? 7) * 86400000) return false;
    }
    batchSeen.add(item.url); return true;
  }).sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
  const sourceCounts = new Map<string, number>();
  const domainCounts = new Map<string, number>();
  const kept = candidates.filter(item => {
    const sourceCount = sourceCounts.get(item.sourceId) || 0;
    const domainCount = domainCounts.get(item.domain) || 0;
    if (item.maxPerRun != null && sourceCount >= item.maxPerRun || domainCount >= MAX_PER_DOMAIN) return false;
    sourceCounts.set(item.sourceId, sourceCount + 1); domainCounts.set(item.domain, domainCount + 1); return true;
  });
  return Object.keys(DOMAIN_LABELS).flatMap(domain => kept.filter(item => item.domain === domain));
}

export function mergePreservedItems(preserved: DigestItem[], fresh: DigestItem[]): DigestItem[] {
  const seen = new Set<string>();
  return [...preserved, ...fresh].filter(item => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
