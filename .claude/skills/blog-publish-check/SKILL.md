---
name: blog-publish-check
description: Validate this Astro blog before publishing or committing content — frontmatter integrity, slug collisions, translation pairing, tag taxonomy, lint, format and build. Use for publish, pre-commit, pre-deploy, or "is this post ready" requests in this repository.
---

# Blog Publish Check

Run this before committing content or pushing to `main`. Deployment is automatic: a push to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to `gh-pages`. There is no manual gate after the push, so the check has to happen before it.

Do not infer a generic "run the tests and ship" flow. This repository has content-level invariants that no test suite covers.

## Checks, in order

Run step 1 first and stop there if it fails — it is the only check specific to this repository's content. For steps 2-4, compare against the known pre-existing failures below before reporting anything as broken.

1. **Content integrity** — `node scripts/check-content.mjs`
   Exit 1 means a real breakage. Warnings are advisory and must not be "fixed" in bulk (see below).
2. **Lint** — `pnpm lint`
3. **Format** — `pnpm run format:check`
4. **Build** — `pnpm run build`
   This runs `astro check` (type check) then `astro build`, and generates OG images via Satori. A post that passes steps 1-3 can still fail here on a bad `ogImage` reference.

## Known pre-existing failures

These fail on a clean checkout and are **not** caused by the content being checked. Report them as environment noise, do not try to fix them as part of a publish check.

- **`pnpm run format:check` fails on ~252 files.** `.prettierrc` sets `endOfLine: "lf"` but the Windows checkout is CRLF. Running `pnpm run format` would rewrite every file in the repo and produce an unreviewable diff. The real fix is a `.gitattributes` or `core.autocrlf` change, done deliberately in its own commit. Until then, check only the files you touched: `npx prettier --check <files>`.
- **`pnpm lint` fails with two `no-empty` errors** in `src/layouts/PostDetails.astro` (lines 365, 378).
- **`pnpm run build` fails offline.** `src/utils/generateOgImages.tsx` fetches IBM Plex Mono from `1001fonts.com` at build time. Without network access the build dies during static route generation. CI has network, so this is local-only.

Because CI runs only `pnpm build` — not lint or format — a lint or format failure does not block deploy. A build failure does.

## What the content check enforces

Errors (these block publishing):

- Missing `title`, `pubDatetime` or `description`
- Malformed `pubDatetime` — a real bug found in this repo: `2024-02-1T...` instead of `2024-02-01T...`
- Duplicate `slug` across posts, which collides silently at route generation
- `isTranslation: true` without a matching `src/content/originals/<slug>.md`, which breaks the side-by-side comparison viewer in `PostDetails.astro`
- A translation missing `canonicalURL`
- `slug` that is not kebab-case
- Banned tags from `docs/tag-taxonomy.md` (`blog`, `translation`, `node`, `AI`, `GitHub`)

Warnings (advisory, do not block):

- `slug` differs from filename. **Usually intentional** — published posts keep an older slug to preserve live URLs. Never "fix" these without asking; changing a slug breaks inbound links and search results.
- Missing `tags`, which silently falls back to `["others"]`
- Short `description`, weak for SEO and OG cards
- Orphaned file in `src/content/originals/`
- `[译]` in the title without `isTranslation: true` — expected for early translations that predate the originals collection

## Rules

- Never run `pnpm run format` (the writing variant) as part of this check. If step 3 fails, report which files need formatting and let the user decide.
- Never commit or push merely because all checks passed. Publishing is the user's call.
- Never bulk-edit slugs, tags or descriptions to silence warnings. Warnings describe existing published state; each one needs an individual decision.
- Never set `draft: false` on the user's behalf. Confirm which drafts are intended to go live.
- Check `git status --short` before reporting ready. Untracked content files are easy to miss and will 404 after deploy if left behind.

## New translation checklist

When the post being checked is a translation, verify the pair by hand:

- `src/content/blog/<category>/<slug>.md` — `isTranslation: true`, `canonicalURL` set, title starts with `[译] `
- `src/content/originals/<slug>.md` — same slug, with `title` and `sourceUrl`
- Images under `public/blog-images/<slug>/` are local, not hotlinked to the source site

See `.github/agents/blog-translator.agent.md` for the full translation workflow.

## Report

Return, in this order:

1. Each command run and its result
2. Errors, with the file and the fix needed
3. New warnings introduced by the current changes — ignore pre-existing ones
4. Untracked or modified content files from `git status`
5. A clear verdict: ready to publish, or blocked and why

If everything passes, say so plainly and stop. Do not commit, push, or offer to deploy unless the user asks.
