import { getCollection, type CollectionEntry } from "astro:content";
import {
  DIGEST_DOMAINS,
  DIGEST_DOMAIN_LABELS,
  type DigestDomain,
} from "@config";

export type DigestEntry = CollectionEntry<"digest">;
export type DigestSource = DigestEntry["data"]["sources"][number];

/** Newest first. Digest slugs are `YYYY/MM/DD`, so they double as route paths. */
export async function getSortedDigests(): Promise<DigestEntry[]> {
  const entries = await getCollection("digest");
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/**
 * Calendar date as `YYYY-MM-DD`.
 *
 * Frontmatter dates are parsed as UTC midnight, so reading them back in UTC
 * returns the day that was written. Going through local time would shift the
 * date for anyone west of UTC.
 */
export function digestDate(entry: DigestEntry): string {
  return entry.data.date.toISOString().slice(0, 10);
}

export function digestPath(entry: DigestEntry): string {
  return `/digest/${entry.slug}/`;
}

/** Entries from the last `days` days, counted back from the newest entry. */
export function withinDays(
  entries: DigestEntry[],
  days: number
): DigestEntry[] {
  if (entries.length === 0) return [];
  // Anchored to the newest entry rather than to "now" so the dashboard still
  // shows a populated week when generation has been paused for a few days.
  const newest = entries[0].data.date.getTime();
  const cutoff = newest - (days - 1) * 24 * 60 * 60 * 1000;
  return entries.filter(e => e.data.date.getTime() >= cutoff);
}

/** Entries in the same calendar month as the newest entry. */
export function currentMonth(entries: DigestEntry[]): DigestEntry[] {
  if (entries.length === 0) return [];
  const newest = entries[0].data.date;
  const year = newest.getUTCFullYear();
  const month = newest.getUTCMonth();
  return entries.filter(
    e =>
      e.data.date.getUTCFullYear() === year &&
      e.data.date.getUTCMonth() === month
  );
}

/**
 * Flatten every cited source across `entries`, de-duplicated by URL.
 *
 * The same release can legitimately be cited by two entries (a prerelease and
 * its stable follow-up land days apart), and a weekly roll-up should list it
 * once.
 */
export function collectSources(entries: DigestEntry[]): DigestSource[] {
  const seen = new Set<string>();
  const out: DigestSource[] = [];
  for (const entry of entries) {
    for (const source of entry.data.sources) {
      if (seen.has(source.url)) continue;
      seen.add(source.url);
      out.push(source);
    }
  }
  return out;
}

/** Group sources by domain, keeping the canonical domain order. */
export function sourcesByDomain(
  sources: DigestSource[]
): { domain: DigestDomain; label: string; sources: DigestSource[] }[] {
  return DIGEST_DOMAINS.map(domain => ({
    domain,
    label: DIGEST_DOMAIN_LABELS[domain],
    sources: sources.filter(s => s.domain === domain),
  })).filter(group => group.sources.length > 0);
}

/** Per-domain totals for the summary strip, including domains with no items. */
export function domainCounts(
  sources: DigestSource[]
): { domain: DigestDomain; label: string; count: number }[] {
  return DIGEST_DOMAINS.map(domain => ({
    domain,
    label: DIGEST_DOMAIN_LABELS[domain],
    count: sources.filter(s => s.domain === domain).length,
  }));
}

/** Group entries by `YYYY-MM` for the archive list, newest month first. */
export function groupByMonth(
  entries: DigestEntry[]
): { month: string; entries: DigestEntry[] }[] {
  const months = new Map<string, DigestEntry[]>();
  for (const entry of entries) {
    const month = digestDate(entry).slice(0, 7);
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(entry);
  }
  return [...months.entries()]
    .map(([month, monthEntries]) => ({ month, entries: monthEntries }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

/** Entries citing at least one source in `domain`, with sources narrowed to it. */
export function entriesForDomain(entries: DigestEntry[], domain: DigestDomain) {
  return entries
    .map(entry => ({
      entry,
      sources: entry.data.sources.filter(s => s.domain === domain),
    }))
    .filter(group => group.sources.length > 0);
}
