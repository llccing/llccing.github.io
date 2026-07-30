/**
 * Deduplication for the daily digest.
 *
 * The published digest files are themselves the state: every entry records the
 * URLs it cited, so "already covered" is derivable by reading them back. That
 * avoids a separate state artifact that could drift out of sync with the content
 * (or be lost when a digest file is deleted on purpose).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { MAX_PER_DOMAIN } from "./sources.mjs";

/**
 * Fallback window for sources that declare no `lookbackDays` of their own.
 *
 * A window is not about preventing repeats — URL dedup already makes those
 * impossible, permanently. It only stops a newly added feed from dumping its
 * whole backlog into one day's digest.
 */
export const DEFAULT_LOOKBACK_DAYS = 7;

/** Matches the `digest` collection root in src/content/config.ts. */
export const DIGEST_DIR = join(process.cwd(), "src", "content", "digest");

function safeStat(p) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

function walkMarkdown(dir) {
  const out = [];
  if (!safeStat(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = safeStat(full);
    if (!st) continue;
    if (st.isDirectory()) out.push(...walkMarkdown(full));
    else if (extname(entry) === ".md") out.push(full);
  }
  return out;
}

function frontmatterBlock(raw) {
  const text = raw.replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return "";
  const end = text.indexOf("\n---", 3);
  return end === -1 ? "" : text.slice(4, end);
}

/**
 * Collect every source URL cited by existing digests. Scoped to the frontmatter
 * block so a URL mentioned in prose never masks a genuinely new item.
 */
export function loadSeenUrls(digestDir) {
  const seen = new Set();
  for (const file of walkMarkdown(digestDir)) {
    const block = frontmatterBlock(readFileSync(file, "utf8"));
    for (const match of block.matchAll(/^\s*url:\s*["']?([^"'\s]+)["']?\s*$/gm)) {
      seen.add(match[1]);
    }
  }
  return seen;
}

/**
 * Drop items already cited, duplicated inside this batch, or published outside
 * their source's lookback window. Items with an unparseable date are kept: the
 * URL dedup will stop them reappearing tomorrow.
 *
 * The window is per item because publication cadence is: framework releases land
 * weekly or slower, link blogs land hourly. One global window either starves the
 * slow sources or floods the digest from the fast ones.
 *
 * `fallbackDays` only applies to items whose source declared no window.
 */
export function filterNew(items, seenUrls, fallbackDays = DEFAULT_LOOKBACK_DAYS) {
  const now = Date.now();
  const batchSeen = new Set();
  const fresh = [];

  for (const item of items) {
    if (!item.url || seenUrls.has(item.url) || batchSeen.has(item.url)) continue;

    if (item.publishedAt) {
      const days = item.lookbackDays ?? fallbackDays;
      const ts = new Date(item.publishedAt).getTime();
      if (Number.isFinite(ts) && ts < now - days * 24 * 60 * 60 * 1000) continue;
    }

    batchSeen.add(item.url);
    fresh.push(item);
  }

  // Newest first, undated last.
  return fresh.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Cap per source, then per domain. Runs after dedup on purpose: capping during
 * fetch would let a source's quota fill up with items already covered, hiding
 * the genuinely new ones behind them.
 *
 * Input must already be newest-first, which `filterNew` guarantees.
 */
export function applyCaps(items, maxPerDomain = MAX_PER_DOMAIN) {
  const perSource = new Map();
  const perDomain = new Map();
  const kept = [];

  for (const item of items) {
    const sourceCount = perSource.get(item.sourceId) ?? 0;
    // A source without an explicit cap is trusted to be low-volume.
    if (item.maxPerRun != null && sourceCount >= item.maxPerRun) continue;

    const domainCount = perDomain.get(item.domain) ?? 0;
    if (domainCount >= maxPerDomain) continue;

    perSource.set(item.sourceId, sourceCount + 1);
    perDomain.set(item.domain, domainCount + 1);
    kept.push(item);
  }

  return kept;
}

export { walkMarkdown };
