# Cloudflare Migration Agent Handoff

Status: Phase 3 complete; observation period active

Last verified: 2026-08-02 (Asia/Shanghai)

Repository: `llccing/llccing.github.io`

Branch: `codex/cloudflare-pages-phase-3`

Phase 3 base commit: `f9943bae docs(cloudflare): record phase 2 production cutover`

## Objective

Continue the approved Cloudflare-first migration in
`docs/cloudflare-first-migration-plan.md` one phase at a time. Preserve the
existing GitHub rollback paths, Giscus, GitHub Discussions, annotation data,
Chinese locale behavior, and Asia/Shanghai publishing assumptions.

This file is the operational handoff for the next agent. Detailed evidence is
in `docs/cloudflare-first-migration-phase-2-report.md` and
`docs/cloudflare-first-migration-phase-3-report.md`.

## Current State

### Completed

- Phase 0 and Phase 1 are complete. Their evidence is in
  `docs/cloudflare-first-migration-phase-0-1-report.md`.
- Phase 2 is complete. Cloudflare Pages project `rowan-blog` has active custom
  domains for `rowanliu.com` and `www.rowanliu.com`, with SSL enabled.
- Phase 3 is complete. The GitHub-backed annotation Worker serves same-origin
  `/api/*` and `/auth/*`, production owner authentication uses an HTTP-only
  cookie with CSRF protection, and `/annotations/` is the owner entry.
- The registrar transfer to Cloudflare completed. Google and Cloudflare public
  resolvers now agree on the Cloudflare authoritative nameservers.
- Cloudflare DNS contains these production records:
  - `rowanliu.com CNAME rowan-blog.pages.dev`, proxied, TTL Auto.
  - `www.rowanliu.com CNAME rowan-blog.pages.dev`, proxied, TTL Auto.
- Cloudflare Single Redirect `Redirect www to apex` is active. It returns 301
  and preserves the request path and query string.
- The accidental `llccing.github.io.rowanliu.com` record was deleted after
  explicit user confirmation. It is absent from the Cloudflare DNS table and
  Google Public DNS returns NXDOMAIN.
- GitHub Pages remains available for rollback. The `origin/gh-pages` branch and
  `.github/workflows/deploy.yml` must remain intact during the observation
  period.
- The Phase 2 branch remains pushed at `f9943bae`; the Phase 3 implementation
  continues on `codex/cloudflare-pages-phase-3`.

### External State

- Cloudflare is now the registrar and authoritative DNS provider.
- The local Windows resolver may still show cached Hostinger nameservers even
  though Google and Cloudflare DNS-over-HTTPS agree on Cloudflare delegation.
- GitHub OAuth App `Rowan Blog Inline Comments` uses the same-origin callback
  `https://rowanliu.com/auth/github/callback`.
- Worker version `e443de6c-06e9-4bfb-9edb-91c9b6fcb474` is deployed with the
  same-origin routes. The latest Phase 3 Pages production deployment ID is
  `e070f630-6378-475e-b977-7cba89e540fd`.

Do not treat a stale GitHub Pages response from one resolver as evidence that
the Cloudflare records need to be recreated. First compare multiple public
DNS-over-HTTPS resolvers and the Cloudflare dashboard.

## Phase 2 Validation Evidence

The following checks passed before the Phase 2 report was committed:

- `pnpm lint`
- `pnpm test`: 3 files, 11 tests
- `pnpm check:worker`
- Production-flagged `pnpm build`
- Astro Check with no errors, warnings, or hints
- Jampack: 717 files, 36.56 MiB reduced to 28.73 MiB
- Targeted Prettier checks
- `git diff --check`

Production verification covered representative pages, the 404 route,
canonical and Open Graph URLs, RSS, sitemap, Giscus, inline annotations,
mixed-content references, and desktop/mobile horizontal overflow. Existing
informational warnings for stale Browserslist data and unsupported Shiki
language labels were not introduced by this migration.

## Next Actions

1. Keep observing normal Cloudflare Pages deployments and preserve the GitHub
   Pages rollback path. Do not disable or delete `.github/workflows/deploy.yml`
   and do not delete `origin/gh-pages`.
2. Keep GitHub Discussions authoritative and do not start D1 shadow writes
   until a new explicit Phase 4 request.
3. Before Phase 4, reread `docs/cloudflare-first-migration-phase-3-report.md`,
   export a fresh annotation backup, and verify the current production Worker
   and Pages deployment IDs.
4. Preserve the GitHub OAuth App callback, Worker secrets, Discussions, Giscus,
   and the `workers.dev` fallback.

## Phase 4 Scope When Authorized

Phase 4 adds D1 migrations, imports the exported GitHub annotation data, and
shadow-writes new mutations while GitHub remains authoritative for reads.

Required boundaries:

- Preserve GitHub Discussions as authoritative storage during Phase 4.
- Back up and count-verify exported annotations before D1 changes.
- Make imports and reconciliation idempotent.
- Record mismatches without silently repairing or deleting GitHub data.
- D1 errors must not corrupt or block the GitHub source mutation.
- Preserve Giscus without behavioral changes.
- Keep the existing Worker deployment available as the API rollback path.
- Do not switch public reads to D1, add Queue-based AI, add Durable Objects, or
  retire GitHub workflows in Phase 4.
- Never expose OAuth secrets, GitHub tokens, AI keys, or session tokens in the
  URL, browser storage, logs, DOM, or response bodies.

Phase 4 exit criteria require count-verified import and live shadow-write parity,
idempotent re-runs, no GitHub corruption on D1 errors, and no user-visible D1
read dependency.

## Useful Verification Commands

Run these from the repository root. Do not paste secrets into commands or
terminal output.

```powershell
git status --short --branch
git rev-list --left-right --count origin/codex/cloudflare-pages-phase-3...HEAD

curl.exe -sS "https://dns.google/resolve?name=rowanliu.com&type=NS"
curl.exe -sS "https://dns.google/resolve?name=rowanliu.com&type=A"
curl.exe -sS "https://dns.google/resolve?name=www.rowanliu.com&type=A"
curl.exe -sS "https://dns.google/resolve?name=llccing.github.io.rowanliu.com&type=A"

curl.exe -sS "https://cloudflare-dns.com/dns-query?name=rowanliu.com&type=NS" `
  -H "accept: application/dns-json"
curl.exe -sS "https://cloudflare-dns.com/dns-query?name=www.rowanliu.com&type=A" `
  -H "accept: application/dns-json"

curl.exe --ssl-no-revoke -sS -o NUL -D - --max-redirs 0 https://rowanliu.com/
curl.exe --ssl-no-revoke -sS -o NUL -D - --max-redirs 0 `
  "https://www.rowanliu.com/posts/ai-changed-my-life/?source=handoff"
```

If the local resolver is still stale, use a currently returned Cloudflare proxy
address only for diagnosis with `curl.exe --resolve`; do not hard-code that IP
into DNS or repository configuration.

## Rollback and Safety Rules

- Follow the exact Phase 2 rollback steps in
  `docs/cloudflare-first-migration-phase-2-report.md` if a verified production
  failure requires rollback.
- Any production DNS deletion beyond the already removed accidental record
  requires exact target identification and explicit user confirmation.
- Do not mutate or delete production annotations, replies, GitHub Discussions,
  or Giscus data during verification.
- Do not commit secrets, exported production annotation data, Wrangler local
  state, or generated tokens.
- Preserve unrelated user changes if the worktree becomes dirty.
- Use `pnpm` and run the validation matrix appropriate to any future phase.

## Resume Checklist For The Next Agent

1. Read `AGENTS.md`.
2. Read this handoff, the migration plan, and the Phase 2 and Phase 3 reports.
3. Run `git status --short --branch` and confirm the current branch and local
   changes before editing.
4. Inspect the live Cloudflare and DNS state instead of assuming propagation is
   complete from this snapshot.
5. Confirm the user's requested phase and authorization before making external
   changes.
