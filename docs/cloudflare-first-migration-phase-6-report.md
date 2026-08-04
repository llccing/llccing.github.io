# Cloudflare-First Migration Phase 6 Report

Status: Queue backend production verified; Pages UI release in progress

Last updated: 2026-08-04 (Asia/Shanghai)

Repository: `llccing/llccing.github.io`

Branch: `codex/cloudflare-pages-phase-6`

Base: `main` at `90c07ea1`

## Outcome

Phase 6 replaces the minute-scale GitHub Actions path for site-created `@AI`
annotations with Cloudflare Queues, Workers AI, and D1. The API returns after
the annotation and AI job are stored, while a Queue consumer performs inference
and writes the reply back to D1.

The production backend path completed its first end-to-end test in 6.022
seconds, measured from the D1 job `created_at` timestamp to `completed_at`.
The final Pages UI release and a post-merge production test remain required
before this report can be marked complete.

## Implemented Behavior

- Creating an annotation containing `@AI` stores the annotation and `ai_job` in
  one D1 batch.
- Editing an existing annotation to add `@AI` creates an idempotent job
  immediately after the edit when the annotation does not already have one.
- Queue payloads contain only `jobId`, `annotationId`, and `articlePath` and are
  validated with Zod by the consumer.
- Jobs expose `queued`, `answering`, `completed`, and `failed` states.
- Failed jobs can be retried by the owner through
  `POST /api/owner/annotations/:annotationId/ai/retry`.
- AI replies use deterministic ID `ai:<jobId>`. A unique partial index on
  `replies.ai_job_id` plus `INSERT ... ON CONFLICT DO NOTHING` prevents duplicate
  D1 replies under at-least-once Queue delivery.
- The frontend performs 1.5-second conditional polling only while an article
  has a queued or answering job. It renders progress, completion, failure, and
  retry states and inserts a queued state optimistically.
- D1 completion is authoritative. GitHub Discussion mirroring is asynchronous
  and cannot turn a completed D1 job into a failure.
- New mirrored annotation bodies include `<!-- rowan-ai-queue:v1 -->`. The
  retained legacy workflow skips that marker after the Phase 6 source release.

## Cloudflare Resources

- Worker: `rowan-blog-comments`
- Phase 6 Worker version: `c5ad9157-92c1-45d4-8c32-55f4c4c1311c`
- Phase 5 rollback Worker version: `4629153e-768f-4812-b25a-1fa43cbefcce`
- D1: `rowan-blog-annotations`
- D1 migration: `0003_queue_ai.sql`
- Queue: `rowan-blog-ai-jobs`
- Queue ID: `153752042c734137b4a04840c3dd1d5c`
- Producer bindings: 1
- Consumer bindings: 1
- Workers AI binding: `AI`

The Queue consumer uses `max_batch_size = 1`, explicit per-message `ack()` or
`retry()`, three retries, and bounded retry delays.

## Model Decision

The selected model is `@cf/zai-org/glm-4.7-flash` through the native Workers AI
binding. It was selected from the current Wrangler model catalog because it is
fast, multilingual, and suitable for Chinese dialogue and instruction
following.

Inference settings:

```text
enable_thinking: false
max_completion_tokens: 700
temperature: 0.2
```

The configured model behind the old GitHub Action is stored in a secret and
cannot be read. No same-model quality comparison is claimed.

## Backup And Migration Evidence

The pre-migration remote D1 export is ignored by Git and remains under
`artifacts/cloudflare-migration/`:

```text
d1-phase6-pre-migration-2026-08-04.sql
size: 14,360 bytes
SHA-256: 809656D360A9439D978B917241CB314F1701A4ED8B6C929CA07B9DAADBBA3D72
```

Remote migration verification confirmed:

- `ai_jobs.reply_id`
- `ai_jobs.updated_at`
- `replies.ai_job_id`
- unique partial index `replies_ai_job_id_unique`
- index `ai_jobs_status_updated_idx`
- clean `PRAGMA foreign_key_check`

## Production Backend Verification

Temporary annotation ID:
`ea574900-189a-409e-bad9-1df5950780d0`

AI job ID:
`0b415917-0a78-4508-8579-ce31a46fa4d3`

Observed state:

```text
created_at:   2026-08-04T00:32:35.509Z
started_at:   2026-08-04T00:32:38.617Z
completed_at: 2026-08-04T00:32:41.531Z
end-to-end:   6.022 seconds
attempts:     1
provider:     workers-ai
model:        @cf/zai-org/glm-4.7-flash
reply_id:     ai:0b415917-0a78-4508-8579-ce31a46fa4d3
```

Read verification after completion:

- Public API: 4 active threads and 3 active replies including temporary data.
- Target thread: `aiJob.status = completed` and exactly one D1 reply.
- `SELECT COUNT(*) FROM replies WHERE ai_job_id = <job-id>` returned `1`.
- Pending GitHub mirrors: `0`.
- Failed GitHub mirrors: `0`.
- Foreign-key check: clean.

The annotation and Workers AI reply mirrored to GitHub successfully. Because
the test preceded the source merge, the old default-branch workflow did not yet
contain the marker guard and also posted one GitHub-only reply. This temporary
release-order window did not duplicate D1 or public API data. A post-merge test
must confirm that the marker causes the legacy workflow job to be skipped.

## Local Validation

- `pnpm test`: 7 files, 36 tests passed
- `pnpm lint`: passed
- `pnpm check:worker`: passed
- `pnpm build`: passed
- Astro Check: 0 errors, 0 warnings, 0 hints
- Jampack: 721 files, 36.59 MB to 28.77 MB
- Targeted Prettier: passed
- `git diff --check`: passed
- Local `0003` migration: passed

## Release Exit Criteria

Before marking Phase 6 complete:

1. Merge the Phase 6 source to `main` and wait for Cloudflare Pages production.
2. Verify desktop and 390 x 844 mobile AI status UI without overlap.
3. Create one post-merge temporary `@AI` annotation and observe queued,
   answering, completed, and the rendered AI reply.
4. Confirm the marker-triggered legacy workflow is skipped and GitHub receives
   only the mirrored Workers AI reply.
5. Delete all Phase 6 temporary annotations through the owner UI.
6. Confirm production returns to 3 active annotations, 2 active replies, zero
   pending/failed mirrors, and a clean foreign-key check.

## Rollback

- Roll back the Worker to version
  `4629153e-768f-4812-b25a-1fa43cbefcce` if Queue processing affects API
  correctness.
- Roll back Pages to the last Phase 5 production deployment if the new UI is
  defective.
- Keep Queue, D1, the SQL backup, GitHub Discussions, Giscus, GitHub Pages,
  `origin/gh-pages`, and both workflows. Do not delete production records as a
  rollback mechanism.
