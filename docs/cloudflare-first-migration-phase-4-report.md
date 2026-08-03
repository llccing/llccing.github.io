# Cloudflare Migration Phase 4 Report

Date: 2026-08-04 (Asia/Shanghai)

Status: Phase 4 complete; shadow-write observation active

Production domain: `https://rowanliu.com`

## Scope

Phase 4 adds a project-specific D1 database, versioned schema migrations,
count-verified GitHub Discussions import and reconciliation commands, and
non-blocking D1 shadow writes after successful GitHub mutations.

GitHub Discussions remains authoritative. Public reads still come exclusively
from GitHub. This phase does not switch reads or writes to D1, add optimistic
frontend state, add Queues or Durable Objects, change Giscus, or retire any
GitHub workflow.

## Backup

A fresh read-only export was created before D1 changes:

- Local artifact: `artifacts/cloudflare-migration/annotations-2026-08-03.json`
- SHA-256:
  `1FC02C69F60690911644F90ECBC32424922DEB6BA3495BC85A87E5258CD450BC`
- Discussions scanned: 4
- Discussions exported: 1
- Annotations: 3
- Replies: 2
- Unique annotation and reply IDs: 5
- Article path:
  `/posts/cdnjs-cloudflare-developer-platform-migration/`

The artifact directory is ignored and the production export is not committed.

## D1 State

- Database: `rowan-blog-annotations`
- Database ID: `af86d172-7c99-4bb1-8512-80175a1bcbb7`
- Region: APAC
- Migration: `migrations/comments-api/0001_annotations_shadow.sql`
- Tables: `articles`, `annotations`, `replies`, `annotation_revisions`, and
  `ai_jobs`

GitHub node IDs are stable primary identifiers. The schema includes soft-delete
fields, article versions, future revision storage, and future AI job state. The
Phase 4 runtime uses only the article, annotation, and reply shadow tables.

The migration was applied locally first. Before remote application, Wrangler
reported zero project tables and one pending migration. The same migration was
then applied remotely.

## Import And Reconciliation

The import command validates the export structure and declared counts, rejects
duplicate IDs, generates escaped SQL, and uses idempotent upserts. It does not
clear soft-delete state during a repeated import.

The reconciliation command compares IDs, bodies, authors, timestamps, URLs,
anchors, reply kinds, and all declared counts. It writes an ignored local JSON
report, exits nonzero on mismatches, and never repairs or deletes records.

Both local and remote databases completed two consecutive import and
reconciliation rounds with identical results:

| Record | Expected | Actual |
| --- | ---: | ---: |
| Articles | 1 | 1 |
| Annotations | 3 | 3 |
| Replies | 2 | 2 |
| Mismatches | 0 | 0 |

A final remote reconciliation after Worker deployment also returned the same
counts and zero mismatches.

## Shadow Writes

Worker mutations retain this order:

1. Authenticate and validate the owner request.
2. Complete the GitHub Discussion mutation.
3. Invalidate the GitHub-backed response cache.
4. Schedule the corresponding D1 write with `ctx.waitUntil()`.
5. Return the successful GitHub response without awaiting D1.

Create, update, reply, and delete operations use parameterized D1 prepared
statements. Annotation deletion also soft-deletes its replies. D1 failures and
zero-row reply/update mismatches produce structured
`d1_shadow_write_failed` logs with operation, resource ID, and article path;
they cannot convert a successful GitHub mutation into an HTTP failure.

No production annotation was created, edited, or deleted solely for this
release. Shadow mapping and failure containment are covered by tests. The first
normal owner mutation during the observation period should be followed by the
reconciliation command before Phase 5 begins.

## Deployment

- Worker: `rowan-blog-comments`
- Previous version: `e443de6c-06e9-4bfb-9edb-91c9b6fcb474`
- Phase 4 version: `9b4b990d-9c60-492a-924b-2dcf17baea92`
- Startup time: 17 ms
- Same-origin routes: `rowanliu.com/api/*` and `rowanliu.com/auth/*`
- Fallback: `https://rowan-blog-comments.lcf33123.workers.dev`

Pages was not redeployed because Phase 4 has no frontend or static-site
dependency. The existing Cloudflare Pages production deployment and GitHub
Pages rollback infrastructure remain unchanged.

## Production Evidence

| Check | Result |
| --- | --- |
| Worker fallback `GET /health` | 200 |
| Same-origin `GET /api/comments` | 200, GitHub-backed, 3 annotations and 2 replies |
| Fallback `GET /api/comments` | 200, same GitHub-backed result |
| Anonymous `GET /api/owner/session` | 200, `canWrite: false`, `no-store` |
| Anonymous `POST /api/owner/comments` | 401 |
| Final remote D1 reconciliation | 1 article, 3 annotations, 2 replies, 0 mismatches |

## Validation

| Check | Result |
| --- | --- |
| `pnpm lint` | Passed |
| `pnpm test` | Passed: 6 files, 32 tests |
| `pnpm check:worker` | Passed |
| Production-flagged `pnpm build` | Passed |
| Astro Check | 0 errors, 0 warnings, 0 hints |
| Jampack | 720 files, 36.57 MiB to 28.75 MiB |
| Targeted Prettier | Passed |
| `git diff --check` | Passed |

## Rollback

- Roll the Worker back to version
  `e443de6c-06e9-4bfb-9edb-91c9b6fcb474` if Phase 4 runtime behavior fails.
- Do not delete the D1 database during rollback; it is not on any public read
  path and can remain available for investigation.
- GitHub Discussions remains authoritative, so rollback requires no annotation
  data restoration.
- Keep the production export, Giscus, `workers.dev`, `origin/gh-pages`,
  `.github/workflows/deploy.yml`, and `.github/workflows/annotation-ai.yml`.

## Outcome And Next Boundary

Phase 4 infrastructure, import parity, idempotency, failure isolation, and
production compatibility checks passed. Phase 5 is the next migration phase and
will make D1 authoritative for annotation CRUD and remove full-list reloads.
Phase 6 is the phase that directly addresses slow `@AI` replies by replacing
GitHub Actions startup and queue latency with a Cloudflare Queue consumer.

Do not start Phase 5 or Phase 6 until Phase 4 shadow observation is accepted and
the next phase is explicitly authorized.
