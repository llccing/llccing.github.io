# Cloudflare Migration Phase 0-1 Report

Date: 2026-08-02

Status: Phase 0 complete; Phase 1 preview verification in progress

Production domain: `https://rowanliu.com`

## Scope

This execution is limited to Phase 0 and Phase 1 of the approved migration
plan. Production DNS, GitHub Pages, GitHub Discussions, Giscus, annotation
storage, and all existing GitHub Actions remain active.

## Phase 0 Baseline

### Repository and build

- Baseline commit: `3059823` on `main`.
- Initial worktree change: the untracked migration plan only.
- Local runtime: Node `22.15.1`, pnpm `10.28.0`.
- Production-flagged `pnpm build`: passed in 118.9 seconds.
- Astro Check: 78 files, 0 errors, 0 warnings, 0 hints.
- Jampack: 717 processed files, 36.65 MiB to 28.82 MiB.
- Final Pages artifact: 677 files, 26.42 MiB total.
- Largest file: `blog-images/signal-decision-chart/signal.png`, 0.903 MiB.
- Pages limits check: passed (under 20,000 files and 25 MiB per file).

Validation results:

| Check | Result |
| --- | --- |
| `pnpm lint` | Passed |
| `pnpm test` | Passed: 3 files, 11 tests |
| `pnpm check:worker` | Passed; dry-run bundle 96.33 KiB gzip |
| Production-flagged `pnpm build` | Passed |
| Targeted Prettier | Passed |
| `git diff --check` | Passed |

### Production HTTP baseline

The following routes returned the expected status from GitHub Pages:

| Route | Status |
| --- | --- |
| `/` | 200 |
| `/posts/ai-changed-my-life/` | 200 |
| `/short-stories/company-annual-meeting-layoff/` | 200 |
| `/search/` | 200 |
| `/tags/ai/` | 200 |
| `/rss.xml` | 200 |
| `/sitemap-index.xml` | 200 |
| `/about/` | 200 |
| `/does-not-exist-phase0/` | 404 |

The annotation API returned HTTP 200 in two baseline samples with 433 ms and
366 ms time to first byte. These are point samples, not a p95 measurement.

### Rollback snapshot

- GitHub Pages status: `built`.
- Publishing source: `gh-pages` branch, repository root.
- Custom domain: `rowanliu.com`; HTTPS is enforced.
- GitHub Pages certificate covers `rowanliu.com` and `www.rowanliu.com`.
- Authoritative public DNS snapshot:
  - Apex A: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
    `185.199.111.153`.
  - `www` CNAME: `llccing.github.io`.
- The Cloudflare account currently has no `rowanliu.com` Zone.

No DNS value was changed. Phase 2 must onboard and verify the Zone before any
custom-domain cutover, and rollback must restore the values above.

### Secret inventory

Only names were inspected. No secret value was printed or written to the
report.

- Comments Worker: `GITHUB_OAUTH_CLIENT_ID`,
  `GITHUB_OAUTH_CLIENT_SECRET`, `GITHUB_TOKEN`, `SESSION_SECRET`.
- GitHub repository: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `BLOG_PAT`,
  `SERVER_IP`, `SERVER_USER`, `SSH_PRIVATE_KEY`.

### Annotation backup

- Command: `pnpm comments:export`.
- Local ignored artifact:
  `artifacts/cloudflare-migration/annotations-2026-08-02.json`.
- Discussions scanned: 4.
- Discussions containing annotations: 1.
- Annotations: 1; unique stable node IDs: 1.
- Replies: 1; unique stable node IDs: 1.
- SHA-256:
  `642F70C63C8E96E135D7B84F5FEE575C65BF53BC62D6119F229554CF101E89EE`.

The export includes raw bodies, anchors, authors, timestamps, URLs, and stable
GitHub node IDs. Re-running the command produces a fresh count-verifiable JSON
artifact without mutating GitHub Discussions.

## Phase 1 Pages Preview

### Project configuration

- Project: `rowan-blog`.
- Git provider: GitHub.
- Repository: `llccing/llccing.github.io`.
- Production branch: `main`.
- Build command: `pnpm build`.
- Output directory: `dist`.
- Node version: `22.15.1`, pinned through `.node-version` and `NODE_VERSION`.
- Preview deployments: enabled for all branches.
- Preview comments: enabled.
- Environment variable names:
  - `PUBLIC_INLINE_COMMENTS`
  - `PUBLIC_COMMENTS_API_URL`
  - `NODE_VERSION`

The first isolated direct-upload deployment uses the verified local build:

- Deployment: `https://a64fda34.rowan-blog.pages.dev`
- Stable preview alias: `https://phase-1.rowan-blog.pages.dev`
- Deployment ID: `a64fda34-9f14-4121-84bd-328acfd49558`
- Uploaded files: 677.

The existing comments Worker allowlist contains the exact stable preview
origin. No wildcard origin was introduced. Worker version
`0b6003b9-784a-4d92-8d45-e36374b0abb1` deployed successfully after its type
check and dry run passed.

### Preview validation

HTTP checks passed for the homepage, representative post, representative short
story, search, tag page, RSS, sitemap, About page, both resume PDFs, and 404
behavior. Generated canonical and share URLs continue to reference
`https://rowanliu.com`.

Real Chromium checks:

- Giscus iframe rendered on the representative post.
- The existing annotation page loaded one annotation and one reply.
- Public users had no owner login or annotation-create controls.
- Desktop viewport `1440 x 900`: document width equaled viewport width.
- Mobile viewport `390 x 844`: document width equaled viewport width.
- The mobile annotation sheet was exactly 390 px wide and remained inside the
  viewport (`left=0`, `right=390`, `bottom=844`).
- The only browser console errors on the zero-comment article were expected
  Giscus 404 responses indicating that no Giscus Discussion exists yet.
- Screenshot evidence is stored locally at
  `output/playwright/cloudflare-phase1-mobile-annotation.png` and ignored by
  Git.

### Git build evidence

Pending validation from the Git-integrated preview branch.

## Blockers and Recommendation

Current recommendation: **no-go for Phase 2 until the Git-integrated preview
build passes and `rowanliu.com` is onboarded into the Cloudflare account**.

The direct-upload Pages preview is healthy, but it is not sufficient evidence
for the required Git build path. No production switch should occur based only
on this deployment.
