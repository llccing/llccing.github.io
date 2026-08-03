# Cloudflare Migration Phase 5 Report

Date: 2026-08-04 (Asia/Shanghai)

Status: Phase 5 implemented; production observation active

Production domain: `https://rowanliu.com`

## Scope

Phase 5 makes D1 authoritative for annotation reads and writes, removes GitHub
GraphQL and complete-list reloads from normal CRUD latency, adds optimistic UI
state, versioned conditional reads, revision history, soft deletion, and
structured D1 metrics.

This phase does not replace the slow GitHub Actions `@AI` workflow. Queue-based
AI processing is Phase 6. It also does not add Durable Objects or WebSockets,
change DNS or Giscus, delete Discussions, disable workflows, or remove GitHub
Pages rollback infrastructure.

## Data Protection And Migration

A fresh GitHub Discussions export was reconciled before implementation:

| Record | GitHub export | Remote D1 |
| --- | ---: | ---: |
| Articles | 1 | 1 |
| Annotations | 3 | 3 |
| Replies | 2 | 2 |
| Mismatches | 0 | 0 |

Ignored baseline:
`artifacts/cloudflare-migration/annotations-phase5-baseline-2026-08-04.json`.

Before the remote migration, the complete D1 database was exported to the
ignored file
`artifacts/cloudflare-migration/d1-phase5-pre-migration-2026-08-04.sql`.

Migration `0002_d1_primary.sql` adds `github_mirror_state` to articles,
annotations, and replies. Existing imported records default to `synced`. New
D1-first records use unique pending GitHub identifiers until the asynchronous
archive returns real GitHub node IDs and URLs. This avoids rebuilding populated
tables or weakening the Phase 4 uniqueness constraints.

The migration was applied locally before remote. Both environments retained
1 article, 3 annotations, and 2 replies, and both returned an empty
`PRAGMA foreign_key_check` result.

## Authoritative D1 API

`GET /api/comments` now reads articles, active annotations, and active replies
directly through the D1 binding. It does not call GitHub. Queries use prepared
statements and exclude annotations with `status != 'open'`, annotations with a
`deleted_at` value, their child replies, and individually deleted replies.

Responses include the article `version` and an ETag of
`"comments-<version>"`. A matching `If-None-Match` returns `304` without a
response body.

Authenticated mutations now use this order:

1. Validate origin, owner session, CSRF token, path, and request body.
2. Create, update, or soft-delete the D1 resource.
3. Increment the article version exactly once.
4. Return the D1 result to the browser.
5. Mirror to GitHub asynchronously with `ctx.waitUntil()`.

Edits insert the previous body into `annotation_revisions`. Annotation deletion
soft-deletes its child replies. A GitHub archive failure changes mirror state
and emits a structured error, but cannot convert a successful D1 operation into
an HTTP error.

## Optimistic Frontend

The existing React annotation island now updates local state before awaiting
the network:

- annotation create inserts a temporary thread;
- reply create appends a temporary reply;
- edit updates the displayed body;
- delete removes the resource immediately;
- success replaces temporary IDs with authoritative D1 IDs;
- failure restores the exact previous snapshot and exposes a retry action.

Pending state uses fixed-size spinner slots and restrained opacity. Mutations
are serialized so one rollback cannot overwrite a concurrent successful
operation. Mutation handlers no longer call the complete-list `reload()`.

## Observability

Structured `comments_d1_metric` logs include route, operation, HTTP status, D1
duration, result count where relevant, and article version. Failure logs contain
operation, resource ID, article path, and error class/message only. Bodies,
cookies, CSRF tokens, prompts, OAuth values, and secrets are excluded.

Eight small end-to-end production read samples from the release machine ranged
from 422 ms to 750 ms. Those measurements include client network and TLS time
and are not a valid D1 p95. Cloudflare-reported migration verification queries
were below 1 ms, but those are administrative SQL timings rather than public
request latency. A true production p95 requires an observation window with
enough `comments_d1_metric` events.

## Deployment

- D1 migration: `0002_d1_primary.sql`
- Previous Worker version: `9b4b990d-9c60-492a-924b-2dcf17baea92`
- Phase 5 Worker version: `4629153e-768f-4812-b25a-1fa43cbefcce`
- Worker startup time: 13 ms
- Same-origin routes: `rowanliu.com/api/*` and `rowanliu.com/auth/*`
- Fallback: `https://rowan-blog-comments.lcf33123.workers.dev`

The Worker was deployed before the frontend. The additive `version` field and
new mutation responses remain compatible with the Phase 4 frontend during the
staged rollout.

## Production Evidence

| Check | Result |
| --- | --- |
| Same-origin `GET /api/comments` | 200, D1-backed, 3 annotations and 2 replies |
| Conditional read | 304, empty body, `ETag: "comments-0"` |
| Remote D1 counts | 1 article, 3 annotations, 2 replies |
| Imported mirror states | all `synced` |
| Remote foreign-key check | no violations |
| Public-read GitHub calls in test | zero |
| Async GitHub failure containment | D1 success retained; failure logged |

## Validation

| Check | Result |
| --- | --- |
| `pnpm lint` | Passed |
| `pnpm test` | Passed: 7 files, 34 tests |
| `pnpm check:worker` | Passed |
| Production `pnpm build` | Passed |
| Astro Check | 0 errors, 0 warnings, 0 hints |
| Jampack | 721 files, 36.59 MiB to 28.77 MiB |
| Targeted Prettier | Passed |
| `git diff --check` | Passed |

## Rollback

- Roll the Worker back to
  `9b4b990d-9c60-492a-924b-2dcf17baea92` if D1-primary behavior fails.
- Restore the last verified Cloudflare Pages deployment if optimistic UI
  behavior fails.
- Keep D1 and its SQL backup for investigation; do not drop tables or erase
  Phase 5 writes during rollback.
- GitHub Discussions, Giscus, `workers.dev`, `origin/gh-pages`,
  `.github/workflows/deploy.yml`, and `.github/workflows/annotation-ai.yml`
  remain intact.

## Outcome And Next Boundary

Phase 5 removes GitHub GraphQL and full-list reloads from normal annotation
CRUD. Phase 6 is the next authorized boundary and directly addresses slow
`@AI` replies with Cloudflare Queues, idempotent job processing, D1 reply writes,
and visible retry state.

Do not start Phase 6 or disable the GitHub Actions AI workflow until Phase 5
observation is accepted and Phase 6 is explicitly authorized.
