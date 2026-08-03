# Cloudflare Migration Agent Handoff

Status: Phase 4 complete; shadow-write observation active

Last verified: 2026-08-04 (Asia/Shanghai)

Repository: `llccing/llccing.github.io`

Branch: `codex/cloudflare-pages-phase-4`

Base: `main` at `2ed4469f`

## Objective

Continue the Cloudflare-first migration one phase at a time. Preserve GitHub
source, Discussions, Giscus, Pages rollback infrastructure, the legacy Worker
URL, Chinese locale behavior, and Asia/Shanghai publishing assumptions.

Detailed Phase 4 evidence is in
`docs/cloudflare-first-migration-phase-4-report.md`.

## Current Production State

- `rowanliu.com` and `www.rowanliu.com` are served by Cloudflare Pages.
- Cloudflare is registrar and authoritative DNS provider.
- The custom-domain Worker routes are `rowanliu.com/api/*` and
  `rowanliu.com/auth/*`.
- Worker `rowan-blog-comments` version
  `9b4b990d-9c60-492a-924b-2dcf17baea92` is deployed.
- `https://rowan-blog-comments.lcf33123.workers.dev` remains enabled.
- D1 `rowan-blog-annotations`
  (`af86d172-7c99-4bb1-8512-80175a1bcbb7`, APAC) has migration
  `0001_annotations_shadow.sql` applied.
- Remote D1 contains 1 article, 3 annotations, and 2 replies with zero
  reconciliation mismatches.
- GitHub Discussions remains authoritative for all public reads and mutations.
- Successful GitHub mutations now schedule non-blocking D1 shadow writes.

## Preserved Rollback Paths

- Do not delete or modify GitHub Discussions or Giscus data.
- Keep `.github/workflows/annotation-ai.yml` active until Phase 6 has passed its
  observation period.
- Keep `.github/workflows/deploy.yml` and `origin/gh-pages`.
- Keep the current Pages production deployment and `workers.dev` fallback.
- Do not delete D1 on rollback; it is not required by public reads in Phase 4.
- Previous Worker version:
  `e443de6c-06e9-4bfb-9edb-91c9b6fcb474`.

## Phase 4 Observation

No synthetic production mutation was made for the Phase 4 release. After the
owner next creates, edits, replies to, or deletes an annotation normally, run:

```powershell
pnpm comments:d1:reconcile -- `
  --input artifacts/cloudflare-migration/annotations-2026-08-03.json `
  --remote
```

The static backup will intentionally report differences after a legitimate new
mutation. Export a fresh GitHub snapshot and reconcile against that snapshot to
prove current shadow parity. Never run import merely to hide a mismatch; first
classify whether it is a legitimate GitHub change or a D1 shadow failure.

Structured Worker failures use message `d1_shadow_write_failed` and include the
operation, resource ID, and article path without secrets.

## Next Phases

Phase 5 makes D1 authoritative for reads and writes, adds optimistic frontend
updates, versioned responses, conditional refetch, soft deletion, revision
history, and latency/error metrics. It removes GitHub GraphQL and full-list
reload latency from normal annotation CRUD.

Phase 6 directly addresses slow `@AI` replies. It enqueues owner annotations
containing `@ai`, processes them in an idempotent Cloudflare Queue consumer,
writes replies to D1, and exposes queued/answering/completed/failed/retry UI
states. GitHub Actions remains active until the Queue path has been observed and
the old workflow is explicitly disabled.

Do not start Phase 5, Phase 6, Queues, Durable Objects, public D1 reads, workflow
retirement, or DNS changes without explicit authorization for that phase.

## Validation Baseline

- `pnpm lint`: passed
- `pnpm test`: 6 files, 32 tests passed
- `pnpm check:worker`: passed
- Production `pnpm build`: passed
- Astro Check: 0 errors, 0 warnings, 0 hints
- Jampack: 720 files, 36.57 MiB to 28.75 MiB
- Targeted Prettier: passed
- `git diff --check`: passed
- Same-origin and fallback reads: HTTP 200
- Anonymous session: read-only
- Anonymous mutation: HTTP 401
- Final D1 reconciliation: 1/3/2, zero mismatches

## Resume Checklist

1. Read `AGENTS.md`, this handoff, the migration plan, and the Phase 4 report.
2. Inspect `git status`, the current branch, and live Worker/Pages versions.
3. Preserve unrelated dirty-worktree changes.
4. Observe at least one normal owner mutation and reconcile a fresh export.
5. Obtain explicit authorization before starting Phase 5.
