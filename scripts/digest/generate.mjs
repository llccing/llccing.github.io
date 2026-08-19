#!/usr/bin/env node
/**
 * Generate one daily digest entry under src/content/digest/YYYY/MM/DD.md.
 *
 * Pipeline: fetch real sources -> drop items already covered -> summarize ->
 * write. When nothing new turned up no file is written at all, which is what
 * keeps empty placeholder entries out of the repo.
 *
 * Usage:
 *   node scripts/digest/generate.mjs              # full run, needs AI_API_KEY
 *   node scripts/digest/generate.mjs --dry-run    # fetch + dedupe only, no model call
 *   node scripts/digest/generate.mjs --force      # overwrite today's entry
 *
 * Env: AI_API_KEY, AI_BASE_URL, AI_MODEL, GITHUB_TOKEN (optional, raises rate limit)
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { SOURCES, DOMAIN_LABELS } from "./sources.mjs";
import { fetchAll } from "./fetch.mjs";
import { loadSeenUrls, loadDigestItems, filterNew, applyCaps, DIGEST_DIR } from "./state.mjs";
import { summarize, renderSources } from "./summarize.mjs";
import { runWorkerDigest } from "./worker-client.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const OFFLINE = process.argv.includes("--offline");
const WORKER = process.env.DIGEST_BACKEND === "worker";

/** Today in Asia/Shanghai, the timezone the whole site is configured for. */
function beijingToday() {
  // en-CA formats as YYYY-MM-DD, so no manual offset arithmetic is needed.
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

function groupByDomain(items) {
  const grouped = new Map();
  for (const item of items) {
    if (!grouped.has(item.domain)) grouped.set(item.domain, []);
    grouped.get(item.domain).push(item);
  }
  // Keep domain order stable and aligned with the registry rather than with
  // whatever order the network happened to return.
  const ordered = new Map();
  for (const domain of Object.keys(DOMAIN_LABELS)) {
    if (grouped.has(domain)) ordered.set(domain, grouped.get(domain));
  }
  return ordered;
}

function buildFrontmatter({ dateStr, itemsByDomain, indexed, model }) {
  const domains = [...itemsByDomain.keys()];
  const counts = domains
    .map(d => `${DOMAIN_LABELS[d]} ${itemsByDomain.get(d).length} 条`)
    .join("，");

  const lines = [
    "---",
    `title: "技术简报 ${dateStr}"`,
    `date: ${dateStr}`,
    `description: ${JSON.stringify(`${dateStr} 技术动态：${counts}。`)}`,
    `domains: ${JSON.stringify(domains)}`,
    `generatedBy: ${JSON.stringify(model)}`,
    `itemCount: ${indexed.length}`,
    "reviewed: false",
    "sources:",
  ];

  for (const item of indexed) {
    lines.push(`  - title: ${JSON.stringify(item.title)}`);
    lines.push(`    url: ${JSON.stringify(item.url)}`);
    lines.push(`    domain: ${JSON.stringify(item.domain)}`);
    lines.push(`    label: ${JSON.stringify(item.sourceLabel)}`);
    if (item.publishedAt) {
      lines.push(`    publishedAt: ${item.publishedAt}`);
    }
  }

  lines.push("---", "");
  return lines.join("\n");
}

/**
 * Build a digest body without calling a model: one bullet per item, grouped by
 * domain. Used by --offline so the pages can be developed and verified against
 * real fetched data on a machine that cannot reach the model endpoint.
 *
 * Not a fallback for the scheduled run — CI must fail loudly rather than commit
 * an unsummarized entry.
 */
function composeWithoutModel(itemsByDomain) {
  const lines = [];
  const indexed = [];
  let index = 0;

  for (const [domain, items] of itemsByDomain) {
    lines.push(`## ${DOMAIN_LABELS[domain]}\n`);
    for (const item of items) {
      index += 1;
      indexed.push(item);
      lines.push(`- ${item.sourceLabel}：${item.title} [${index}]`);
    }
    lines.push("");
  }

  return { body: lines.join("\n").trim(), indexed };
}

async function main() {
  const dateStr = beijingToday();
  const [year, month, day] = dateStr.split("-");
  const outPath = join(DIGEST_DIR, year, month, `${day}.md`);
  const preservedItems = FORCE ? loadDigestItems(outPath) : [];

  console.log(`Digest for ${dateStr} (Asia/Shanghai)`);

  if (existsSync(outPath) && !FORCE) {
    console.log(`Entry already exists: ${outPath}`);
    console.log("Pass --force to regenerate.");
    return;
  }

  const seen = loadSeenUrls(DIGEST_DIR);
  let workerResult;
  if (WORKER) {
    const runKey = [process.env.GITHUB_RUN_ID, process.env.GITHUB_RUN_ATTEMPT]
      .filter(Boolean)
      .join("-");
    workerResult = await runWorkerDigest({
      date: dateStr,
      seenUrls: [...seen],
      preservedItems,
      runKey: runKey || undefined,
    });
  }

  const { items: fetched, failures } = workerResult || (await fetchAll(SOURCES));

  // A rotted feed URL should be visible, not silently narrow the digest.
  for (const failure of failures) {
    console.warn(`  ! source "${failure.id}" failed: ${failure.message}`);
  }

  console.log(`Fetched ${fetched.length} items from ${SOURCES.length - failures.length}/${SOURCES.length} sources`);

  if (fetched.length === 0 && preservedItems.length === 0) {
    console.log("No items fetched from any source. Nothing to do.");
    return;
  }

  const candidates = workerResult ? fetched : filterNew(fetched, seen);
  const fresh = workerResult ? fetched : applyCaps(candidates);
  const merged = workerResult ? fetched : [...preservedItems, ...fresh];

  console.log(
    `Preserved: ${preservedItems.length}; new: ${candidates.length} → ${fresh.length} kept after caps`
  );

  if (merged.length === 0) {
    console.log("No new items since the last digest. No file written.");
    return;
  }

  const itemsByDomain = groupByDomain(merged);
  console.log(
    `New items by domain: ${[...itemsByDomain]
      .map(([d, items]) => `${d}=${items.length}`)
      .join(" ")}`
  );

  if (DRY_RUN) {
    console.log("\n--dry-run: skipping model call. Items that would be summarized:\n");
    for (const [domain, items] of itemsByDomain) {
      console.log(`## ${DOMAIN_LABELS[domain]}`);
      for (const item of items) {
        console.log(`  - ${item.sourceLabel}: ${item.title}`);
        console.log(`    ${item.url}`);
      }
    }
    return;
  }

  const { body, indexed } = workerResult
    ? { body: workerResult.body, indexed: merged }
    : OFFLINE
    ? composeWithoutModel(itemsByDomain)
    : await summarize(itemsByDomain, dateStr);
  const model = workerResult
    ? `${workerResult.provider}/${workerResult.model}`
    : OFFLINE
      ? "offline (no model)"
      : process.env.AI_MODEL || "gpt-4o";

  const content =
    buildFrontmatter({ dateStr, itemsByDomain, indexed, model }) +
    body +
    "\n" +
    renderSources(indexed);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, content, "utf-8");
  console.log(`\nWrote ${outPath} (${indexed.length} items)`);
}

main().catch(err => {
  console.error(`\nDigest generation failed: ${err.message}`);
  process.exit(1);
});
