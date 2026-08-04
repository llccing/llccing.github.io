# Cloudflare Migration Agent Handoff

Status: Phase 6 complete; production observation active

Last verified: 2026-08-04 (Asia/Shanghai)

Repository: `llccing/llccing.github.io`

Branch: `codex/cloudflare-pages-phase-6`

Base: `main` at `90c07ea1`

## Objective

Continue the Cloudflare-first migration one authorized phase at a time.
Preserve GitHub source, Discussions, Giscus, GitHub Pages rollback
infrastructure, the Worker fallback URL, Chinese locale behavior, and
Asia/Shanghai publishing assumptions.

Detailed evidence is in
`docs/cloudflare-first-migration-phase-6-report.md`.

## Current Production State

- `rowanliu.com` and `www.rowanliu.com` are served by Cloudflare Pages.
- Cloudflare is registrar and authoritative DNS provider.
- Worker routes are `rowanliu.com/api/*` and `rowanliu.com/auth/*`.
- Worker `rowan-blog-comments` version
  `7f7f8e51-4cb1-41c0-a2b6-f51ce639366e` is deployed.
- `https://rowan-blog-comments.lcf33123.workers.dev` remains enabled.
- D1 `rowan-blog-annotations`
  (`af86d172-7c99-4bb1-8512-80175a1bcbb7`, APAC) has migrations `0001` through
  `0003` applied.
- Remote D1 contains 1 article, 3 annotations, and 2 replies. All imported
  records have `github_mirror_state = 'synced'`; foreign-key checks are clean.
- D1 is authoritative for annotation reads and writes.
- GitHub mirroring runs asynchronously with `ctx.waitUntil()` and cannot turn a
  successful D1 mutation into an HTTP failure.
- Public responses carry an article version and ETag. Matching
  `If-None-Match` requests return `304`.
- The frontend applies optimistic create, reply, edit, and delete state and
  does not reload the complete list after a mutation.
- Queue `rowan-blog-ai-jobs` has one producer and one consumer binding.
- Workers AI uses `@cf/zai-org/glm-4.7-flash` through the native `AI` binding.
- The first production Queue job completed in 6.022 seconds with one attempt
  and exactly one D1 reply. The post-merge job completed in 3.615 seconds.
- PR #39 was squash-merged as `86426cea`; Pages production deployment
  `7c315565-0f34-4a76-83e6-b7735a9390b8` serves the Phase 6 UI.
- Production cleanup restored 3 active annotations and 2 active replies with
  no pending or failed mirrors and clean foreign keys.

## Preserved Rollback Paths

- Do not delete or modify GitHub Discussions or Giscus data.
- Keep `.github/workflows/annotation-ai.yml`. The Phase 6 version skips mirrored
  comments containing `rowan-ai-queue:v1` but remains compatible with direct
  GitHub annotations.
- Keep `.github/workflows/deploy.yml` and `origin/gh-pages`.
- Keep the last verified Cloudflare Pages deployment and `workers.dev`
  fallback.
- Do not delete D1 on rollback. Preserve the pre-migration SQL export under the
  ignored `artifacts/cloudflare-migration/` directory.
- Phase 4 Worker rollback version:
  `9b4b990d-9c60-492a-924b-2dcf17baea92`.
- Phase 5 Worker rollback version:
  `4629153e-768f-4812-b25a-1fa43cbefcce`.

## Phase 5 Observation

Structured Worker metrics use message `comments_d1_metric` and record route,
operation, HTTP status, D1 duration, result count, and article version. They do
not contain bodies, cookies, CSRF values, prompts, or secrets.

GitHub archive failures use message `github_mirror_failed`. New records retain
an internal pending mirror identifier until GitHub returns a real node ID.
Existing real node IDs remain available for a later retry if an update mirror
fails.

Monitor a representative production sample before reporting a true p95. The
release verification contains only a small set of end-to-end samples and must
not be presented as a statistically meaningful D1 p95.

## Next Phase

Phase 6 is complete. Continue production observation before separately
authorizing Phase 7. Do not add Durable Objects, WebSockets, DNS changes,
Giscus changes, Discussion deletion, or GitHub Pages retirement without that
authorization.

## Validation Baseline

- `pnpm lint`: passed
- `pnpm test`: 7 files, 36 tests passed
- `pnpm check:worker`: passed
- Production `pnpm build`: passed
- Astro Check: 0 errors, 0 warnings, 0 hints
- Jampack: 721 files, 36.59 MiB to 28.77 MiB
- Targeted Prettier: passed
- `git diff --check`: passed
- Remote migration `0003`: applied; foreign keys clean
- Production Queue jobs: completed in 6.022 and 3.615 seconds, one attempt and
  one D1 reply each
- Final same-origin read: HTTP 200, 3 annotations, 2 replies
- GitHub mirroring: zero pending and zero failed resources

## Resume Checklist

1. Read `AGENTS.md`, this handoff, the migration plan, and the Phase 6 report.
2. Inspect `git status`, the active branch, and live Worker/Pages versions.
3. Check recent `comments_d1_metric` and `github_mirror_failed` logs.
4. Preserve all rollback infrastructure and ignored backup artifacts.
5. Obtain explicit authorization before starting Phase 7.
