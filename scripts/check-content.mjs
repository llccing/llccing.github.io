#!/usr/bin/env node
/**
 * Content integrity checks for src/content.
 *
 * Catches the mistakes Astro's schema cannot: slug/filename drift, translation
 * pairs missing their `originals/` counterpart, tag-taxonomy violations, and
 * frontmatter that is technically valid but wrong for this blog.
 *
 * Usage:
 *   node scripts/check-content.mjs           # report errors and warnings
 *   node scripts/check-content.mjs --quiet   # errors only
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename, extname } from "node:path";

const ROOT = process.cwd();
const BLOG_DIR = join(ROOT, "src/content/blog");
const STORIES_DIR = join(ROOT, "src/content/short-stories");
const ORIGINALS_DIR = join(ROOT, "src/content/originals");

const QUIET = process.argv.includes("--quiet");

const errors = [];
const warnings = [];

function walk(dir) {
  const out = [];
  if (!safeStat(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = safeStat(full);
    if (!st) continue;
    if (st.isDirectory()) out.push(...walk(full));
    else if (extname(entry) === ".md") out.push(full);
  }
  return out;
}

function safeStat(p) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

/** Minimal frontmatter reader: we only need scalars, arrays and the raw block. */
function parseFrontmatter(input) {
  // Files in this repo are checked out with CRLF; normalise before parsing so
  // trailing \r never ends up inside a value.
  const raw = input.replace(/\r\n/g, "\n");
  if (!raw.startsWith("---\n")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = raw.slice(4, end);
  const data = {};
  let currentKey = null;

  for (const line of block.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(stripQuotes(listItem[1].trim()));
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    currentKey = kv[1];
    const value = kv[2].trim();
    data[currentKey] = value === "" ? [] : coerce(stripQuotes(value));
  }
  return data;
}

function stripQuotes(v) {
  return v.replace(/^["'](.*)["']$/, "$1");
}

function coerce(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

const TAG_RULES = [
  [/[A-Z]/, "tag must be lowercase"],
  [/[一-龥]/, "tag must be English, not Chinese"],
  [/\s/, "tag must use kebab-case, not spaces"],
  [/_/, "tag must use kebab-case, not underscores"],
];

// From docs/tag-taxonomy.md
const BANNED_TAGS = new Map([
  ["blog", "filler tag"],
  ["translation", "workflow tag; translation state lives in isTranslation"],
  ["node", "use nodejs"],
  ["AI", "use ai"],
  ["GitHub", "use github"],
]);

function checkTags(rel, tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    warnings.push(`${rel}: no tags, will fall back to ["others"]`);
    return;
  }
  if (tags.length > 4) {
    warnings.push(
      `${rel}: ${tags.length} tags; taxonomy prefers 1-3 (see docs/tag-taxonomy.md)`
    );
  }
  for (const tag of tags) {
    const banned = BANNED_TAGS.get(tag);
    if (banned) errors.push(`${rel}: banned tag "${tag}" (${banned})`);
    for (const [pattern, message] of TAG_RULES) {
      // Taxonomy style is advisory: the short-story series deliberately keeps a
      // Chinese series tag. Surface it, but never fail the build over style.
      if (pattern.test(tag)) warnings.push(`${rel}: tag "${tag}" — ${message}`);
    }
  }
}

function checkPost(file, { requireSlug }) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const raw = readFileSync(file, "utf8");
  const fm = parseFrontmatter(raw);

  if (!fm) {
    errors.push(`${rel}: missing or malformed frontmatter block`);
    return null;
  }

  // Required by src/content/config.ts — fail here rather than at build time.
  for (const field of ["title", "pubDatetime", "description"]) {
    if (!fm[field]) errors.push(`${rel}: missing required field "${field}"`);
  }

  const fileSlug = basename(file, ".md");
  if (requireSlug) {
    if (!fm.slug) {
      warnings.push(`${rel}: no explicit slug; Astro will derive "${fileSlug}"`);
    } else if (fm.slug !== fileSlug) {
      // Published posts sometimes keep an older slug on purpose to preserve
      // live URLs. Flag the drift; changing it would break inbound links.
      warnings.push(
        `${rel}: slug "${fm.slug}" does not match filename "${fileSlug}"`
      );
    }
  }

  if (fm.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.slug)) {
    errors.push(`${rel}: slug "${fm.slug}" is not kebab-case`);
  }

  if (typeof fm.description === "string" && fm.description.length > 0) {
    if (fm.description.length < 20) {
      warnings.push(`${rel}: description is very short, weak for SEO and OG`);
    }
  }

  if (fm.pubDatetime && !/\d{4}-\d{2}-\d{2}/.test(String(fm.pubDatetime))) {
    errors.push(`${rel}: pubDatetime "${fm.pubDatetime}" is not a valid date`);
  }

  checkTags(rel, fm.tags);
  return { rel, fm, fileSlug };
}

function checkTranslation(post, originalSlugs) {
  const { rel, fm, fileSlug } = post;
  const slug = fm.slug || fileSlug;
  const titleIsMarked =
    typeof fm.title === "string" && fm.title.startsWith("[译]");

  if (fm.isTranslation === true) {
    if (!originalSlugs.has(slug)) {
      errors.push(
        `${rel}: isTranslation is true but src/content/originals/${slug}.md is missing — the comparison viewer will break`
      );
    }
    if (!fm.canonicalURL) {
      errors.push(`${rel}: translation is missing canonicalURL`);
    }
    if (!titleIsMarked) {
      warnings.push(`${rel}: translation title should start with "[译] "`);
    }
  } else if (titleIsMarked) {
    // Early translations predate the originals collection, so they have no
    // counterpart to compare against. Advisory only.
    warnings.push(
      `${rel}: title is marked "[译]" but isTranslation is not true, so the comparison viewer stays off`
    );
  }
}

// --- run ---

const originalFiles = walk(ORIGINALS_DIR);
const originalSlugs = new Set(originalFiles.map(f => basename(f, ".md")));

for (const file of originalFiles) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const fm = parseFrontmatter(readFileSync(file, "utf8"));
  if (!fm) {
    errors.push(`${rel}: missing or malformed frontmatter block`);
    continue;
  }
  if (!fm.title) errors.push(`${rel}: missing required field "title"`);
}

const blogPosts = [];
for (const file of walk(BLOG_DIR)) {
  const post = checkPost(file, { requireSlug: true });
  if (post) blogPosts.push(post);
}

for (const file of walk(STORIES_DIR)) {
  checkPost(file, { requireSlug: true });
}

for (const post of blogPosts) {
  checkTranslation(post, originalSlugs);
}

// Duplicate slugs collide silently at route generation.
const bySlug = new Map();
for (const post of blogPosts) {
  const slug = post.fm.slug || post.fileSlug;
  if (!bySlug.has(slug)) bySlug.set(slug, []);
  bySlug.get(slug).push(post.rel);
}
for (const [slug, files] of bySlug) {
  if (files.length > 1) {
    errors.push(`duplicate slug "${slug}" in: ${files.join(", ")}`);
  }
}

// Orphaned originals are not fatal, but they are usually a mistake.
const translationSlugs = new Set(
  blogPosts
    .filter(p => p.fm.isTranslation === true)
    .map(p => p.fm.slug || p.fileSlug)
);
for (const slug of originalSlugs) {
  if (!translationSlugs.has(slug)) {
    warnings.push(
      `src/content/originals/${slug}.md has no published translation referencing it`
    );
  }
}

// --- report ---

const draftCount = blogPosts.filter(p => p.fm.draft === true).length;
console.log(
  `Checked ${blogPosts.length} blog posts, ${originalFiles.length} originals (${draftCount} drafts).`
);

if (!QUIET && warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}

if (errors.length) {
  console.log(`\nErrors (${errors.length}):`);
  for (const e of errors) console.log(`  x ${e}`);
  console.log("\nFailed.");
  process.exit(1);
}

console.log(
  warnings.length ? "\nNo errors. Warnings above are advisory." : "\nAll clear."
);
