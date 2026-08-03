# Cloudflare Migration Agent Handoff

Status: Phase 5 implemented; production D1 observation active

Last verified: 2026-08-04 (Asia/Shanghai)

Repository: `llccing/llccing.github.io`

Branch: `codex/cloudflare-pages-phase-5`

Base: `main` at `005d5930`

## Objective

Continue the Cloudflare-first migration one authorized phase at a time.
Preserve GitHub source, Discussions, Giscus, GitHub Pages rollback
infrastructure, the Worker fallback URL, Chinese locale behavior, and
Asia/Shanghai publishing assumptions.

Detailed evidence is in
`docs/cloudflare-first-migration-phase-5-report.md`.

## Current Production State

- `rowanliu.com` and `www.rowanliu.com` are served by Cloudflare Pages.
- Cloudflare is registrar and authoritative DNS provider.
- Worker routes are `rowanliu.com/api/*` and `rowanliu.com/auth/*`.
- Worker `rowan-blog-comments` version
  `4629153e-768f-4812-b25a-1fa43cbefcce` is deployed.
- `https://rowan-blog-comments.lcf33123.workers.dev` remains enabled.
- D1 `rowan-blog-annotations`
  (`af86d172-7c99-4bb1-8512-80175a1bcbb7`, APAC) has migrations `0001` and
  `0002` applied.
- Remote D1 contains 1 article, 3 annotations, and 2 replies. All imported
  records have `github_mirror_state = 'synced'`; foreign-key checks are clean.
- D1 is authoritative for annotation reads and writes.
- GitHub mirroring runs asynchronously with `ctx.waitUntil()` and cannot turn a
  successful D1 mutation into an HTTP failure.
- Public responses carry an article version and ETag. Matching
  `If-None-Match` requests return `304`.
- The frontend applies optimistic create, reply, edit, and delete state and
  does not reload the complete list after a mutation.

## Preserved Rollback Paths

- Do not delete or modify GitHub Discussions or Giscus data.
- Keep `.github/workflows/annotation-ai.yml` active until Phase 6 has passed its
  observation period.
- Keep `.github/workflows/deploy.yml` and `origin/gh-pages`.
- Keep the last verified Cloudflare Pages deployment and `workers.dev`
  fallback.
- Do not delete D1 on rollback. Preserve the pre-migration SQL export under the
  ignored `artifacts/cloudflare-migration/` directory.
- Phase 4 Worker rollback version:
  `9b4b990d-9c60-492a-924b-2dcf17baea92`.

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

Phase 6 directly addresses slow `@AI` replies. It should:

1. Enqueue owner annotations containing `@ai`.
2. Process jobs with an idempotent Cloudflare Queue consumer.
3. Write AI replies to D1.
4. Expose queued, answering, completed, failed, and retry states.
5. Benchmark the selected model before changing providers.

Do not disable `.github/workflows/annotation-ai.yml` until the Queue path has
passed its observation period. Do not add Durable Objects, WebSockets, DNS
changes, Giscus changes, Discussion deletion, or GitHub Pages retirement as
part of Phase 6.

## Validation Baseline

- `pnpm lint`: passed
- `pnpm test`: 7 files, 34 tests passed
- `pnpm check:worker`: passed
- Production `pnpm build`: passed
- Astro Check: 0 errors, 0 warnings, 0 hints
- Jampack: 721 files, 36.59 MiB to 28.77 MiB
- Targeted Prettier: passed
- `git diff --check`: passed
- Remote migration: 1/3/2 rows, all imported mirrors synced
- Same-origin D1 read: HTTP 200, 3 annotations, 2 replies
- Conditional read: HTTP 304 with `ETag: "comments-0"`

## Resume Checklist

1. Read `AGENTS.md`, this handoff, the migration plan, and the Phase 5 report.
2. Inspect `git status`, the active branch, and live Worker/Pages versions.
3. Check recent `comments_d1_metric` and `github_mirror_failed` logs.
4. Preserve all rollback infrastructure and ignored backup artifacts.
5. Obtain explicit authorization before starting Phase 6.
