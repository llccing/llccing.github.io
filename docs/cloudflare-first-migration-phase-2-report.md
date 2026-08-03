# Cloudflare Migration Phase 2 Report

Date: 2026-08-02

Status: Phase 2 complete; observation period active

Production domain: `https://rowanliu.com`

## Scope

This execution covers Phase 2 of the approved migration plan: attach the apex
and `www` custom domains to Cloudflare Pages, cut production DNS over after
preview validation, establish canonical `www` behavior, and validate the live
site. GitHub Pages and the existing deployment workflow remain available for
rollback.

No annotation storage, Giscus, API route, or application code was migrated in
this phase.

## Cloudflare Configuration

- Account ID: `9a3b62a304fb46240c6a9aae4924780a`.
- Zone ID: `bc6659ffe99092d6102b4421957779ed`.
- Pages project: `rowan-blog`.
- Production deployment ID: `fee4fa8f-fcfb-49b0-8210-6f1b70b6bd0a`.
- Production commit: `aed6d7555c2dd9b33d9300c13763dd4d7066b349`.
- Pages origin: `rowan-blog.pages.dev`.
- `rowanliu.com`: Pages status Active, SSL enabled.
- `www.rowanliu.com`: Pages status Active, SSL enabled.

Production DNS after cutover:

| Name | Type | Target | Proxy | TTL |
| --- | --- | --- | --- | --- |
| `rowanliu.com` | CNAME | `rowan-blog.pages.dev` | Proxied | Auto |
| `www.rowanliu.com` | CNAME | `rowan-blog.pages.dev` | Proxied | Auto |

An accidental `llccing.github.io.rowanliu.com` CNAME created during the manual
cutover was removed after explicit confirmation. Cloudflare's DNS table no
longer contains it, and Google Public DNS returns `NXDOMAIN` for that hostname.
The apex and `www` records remained present and resolvable after the cleanup.

The `www` hostname has a valid Google Trust Services edge certificate with
`www.rowanliu.com` in its SAN and an expiry of 2026-10-31. The apex certificate
was also valid before its DNS cutover.

## Canonical Redirect

Cloudflare Redirect Rule `Redirect www to apex` is active:

- Match: full URI wildcard `https://www.*` inside the `rowanliu.com` Zone.
- Target: `https://${1}`.
- Status: 301 Permanent Redirect.
- Preserve query string: enabled.

Verification:

| Request | Result |
| --- | --- |
| `https://www.rowanliu.com/` | 301 to `https://rowanliu.com/` |
| `https://www.rowanliu.com/posts/cdnjs-cloudflare-developer-platform-migration/?utm_source=phase2&x=1` | 301 to the same apex path and query |
| Apex destination for the nested URL | 200 with no further redirect |

This confirms path and query preservation with no redirect loop.

## Production Validation

### HTTP routes

| Route | Status |
| --- | --- |
| `/` | 200 |
| `/posts/cdnjs-cloudflare-developer-platform-migration/` | 200 |
| `/short-stories/1/` | 200 |
| `/search/` | 200 |
| `/tags/ai/` | 200 |
| `/rss.xml` | 200 |
| `/sitemap-index.xml` | 200 |
| `/about/` | 200 |
| `/assets/resume.pdf` | 200 |
| `/assets/resume-en.pdf` | 200 |
| `/does-not-exist-phase2/` | 404 |

### Metadata and integrations

- The representative article canonical URL and `og:url` both remain
  `https://rowanliu.com/posts/cdnjs-cloudflare-developer-platform-migration/`.
- The representative HTML contained no `http://` asset references.
- RSS and sitemap routes retain the production apex domain.
- The Giscus widget rendered and its lazy iframe mapped the production article
  pathname.
- The inline annotation API accepted the production origin and returned HTTP
  200. The existing article returned one thread and one reply.
- Public users had no owner edit, delete, reply, or annotation-create controls.

### Browser layout

- Desktop article viewport: document width matched viewport width.
- Mobile `390 x 844`: document width matched viewport width.
- Giscus remained present after scrolling.
- Screenshot evidence is stored locally at
  `output/playwright/phase2-article-desktop.png` and
  `output/playwright/phase2-article-mobile.png`.
- Intermittent Google Fonts `ERR_CONNECTION_CLOSED` responses were observed
  from the local network. No site script, asset-path, or layout failure was
  associated with them.

## Local Validation

| Check | Result |
| --- | --- |
| `pnpm lint` | Passed |
| `pnpm test` | Passed: 3 files, 11 tests |
| `pnpm check:worker` | Passed; dry-run bundle 96.33 KiB gzip |
| Production-flagged `pnpm build` | Passed in 137.2 seconds |
| Astro Check | Passed with no errors, warnings, or hints |
| Jampack | Passed: 717 files, 36.56 MiB to 28.73 MiB |
| Targeted Prettier | Passed |
| `git diff --check` | Passed |

The build emitted existing informational warnings for stale Browserslist data
and unsupported Shiki language labels. They did not fail the build and were not
introduced by this documentation-only branch.

## Rollback

GitHub Pages remains ready during the observation period:

- `origin/gh-pages` remains present.
- `.github/workflows/deploy.yml` remains enabled in the repository.
- The last baseline GitHub Pages state was `built`, served from the root of the
  `gh-pages` branch, with HTTPS enforced.

To roll production back:

1. Disable the active `Redirect www to apex` Cloudflare Redirect Rule while
   changing the host.
2. Replace the apex proxied CNAME with the four prior GitHub Pages A records:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and
   `185.199.111.153`.
3. Replace the `www` proxied CNAME target with `llccing.github.io` and use DNS
   only unless Cloudflare proxying has been explicitly revalidated for the
   rollback.
4. Confirm GitHub Pages still reports the `rowanliu.com` custom domain and
   HTTPS enforcement.
5. Verify apex and `www`, representative routes, canonical metadata, Giscus,
   and annotations before declaring rollback complete.

Do not remove the Pages project during rollback. Keeping both hosts available
makes a forward recovery possible after the failure is understood.

## Outcome

All Phase 2 exit criteria passed. Cloudflare Pages now serves the production
apex domain, `www` has deterministic canonical behavior, and the GitHub Pages
rollback path remains intact. Continue the observation period before Phase 8
retires any legacy deployment configuration.
