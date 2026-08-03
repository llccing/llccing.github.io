# Cloudflare Migration Phase 3 Report

Date: 2026-08-02

Status: Phase 3 complete

Production domain: `https://rowanliu.com`

## Scope

Phase 3 moves the existing GitHub Discussions-backed inline annotation API to
same-origin `/api/*` and `/auth/*` routes. It adds a stable `/annotations/`
owner entry and replaces the production fragment/sessionStorage bearer flow
with an HTTP-only cookie session and CSRF validation.

GitHub Discussions remains authoritative storage. This phase does not add D1,
Queues, Durable Objects, optimistic mutation state, soft deletion, or revision
history. Giscus and the legacy deployment workflows are unchanged.

## External State

- The registrar transfer from Hostinger to Cloudflare completed.
- Google and Cloudflare DNS-over-HTTPS both return
  `aitana.ns.cloudflare.com` and `peter.ns.cloudflare.com` as authoritative
  nameservers.
- `llccing.github.io.rowanliu.com` remains `NXDOMAIN`.
- GitHub OAuth App `Rowan Blog Inline Comments` retains client ID
  `Ov23lixhj3nwDChVCcMc` and now uses
  `https://rowanliu.com/auth/github/callback` as its callback URL.
- No OAuth client ID, secret, GitHub token, session token, or CSRF token was
  added to repository configuration or documentation.

## Worker Deployment

- Worker: `rowan-blog-comments`.
- Production version: `e443de6c-06e9-4bfb-9edb-91c9b6fcb474`.
- Worker startup time reported by Wrangler: 13 ms.
- Routes:
  - `rowanliu.com/api/*`
  - `rowanliu.com/auth/*`
- The original `https://rowan-blog-comments.lcf33123.workers.dev` deployment
  remains enabled as an API fallback.

All OAuth starts use the registered same-origin callback. The signed OAuth
state retains the exact allowed return origin and normalized path. Production
returns receive the cookie session; allowed non-production preview returns can
still receive the temporary hash bearer needed by the rollback frontend. The
production frontend never consumes or persists that bearer.

## Session Security

- Production session cookie name: `__Host-rowan-comments-owner`.
- Attributes: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, eight-hour max
  age.
- Every cookie-authenticated mutation requires both an exact allowed `Origin`
  and an `X-CSRF-Token` matching the signed session claim.
- CSRF comparison hashes both values and uses Web Crypto constant-time
  comparison.
- Public session discovery returns `{ "canWrite": false }` with
  `Cache-Control: no-store`; it does not create a browser console error.
- Authorization remains an exact server-side comparison to GitHub login
  `llccing`.
- Logout clears the HTTP-only session cookie.

## Frontend Behavior

- `/annotations/` is the stable author entry.
- The owner can sign in with GitHub, enable or disable annotation mode, enter
  the posts index, and sign out.
- Annotation mode is a non-sensitive local preference and persists across
  article navigation.
- The authenticated session itself is only in the HTTP-only cookie.
- Article pages use relative same-origin API URLs on `rowanliu.com`.
- Preview deployments continue using `PUBLIC_COMMENTS_API_URL`.
- `?annotate=1` still enables annotation mode as a backwards-compatible deep
  link.
- Public readers receive annotations but no author login, create, edit, reply,
  delete, mode, or logout controls unless they explicitly use the owner entry
  or compatibility deep link.

## Production Evidence

| Check | Result |
| --- | --- |
| `GET /api/comments` | 200, same-origin JSON |
| Anonymous `GET /api/owner/session` | 200, `canWrite: false`, `no-store` |
| Anonymous `POST /api/owner/comments` | 401 |
| `GET /auth/github/start` | 302 to GitHub with same-origin callback |
| GitHub callback registration | Updated and accepted |
| Owner OAuth | Returned to `/annotations/` as `@llccing` |
| Owner return URL | Exact path, no hash or session token |
| Cross-article annotation mode | Persisted and showed owner-only controls |
| Public article controls | Zero owner controls |
| Legacy Worker health | 200 |

The owner OAuth check used the existing GitHub authorization and did not create,
edit, reply to, or delete a production annotation. The temporary owner session
was logged out after verification.

## Browser Evidence

- `/annotations/` rendered the owner login entry with zero console errors or
  warnings after anonymous session discovery completed.
- A public article loaded `/api/comments` and `/api/owner/session` from
  `rowanliu.com`, both with HTTP 200.
- The public article showed no owner controls.
- Mobile `390 x 844` had equal document and viewport widths.
- Giscus remained rendered. Its two expected 404 discussion lookups for an
  article with zero comments were followed by a successful widget response and
  the visible `0` comments state.
- No session token appeared in the production URL, rendered DOM, or
  `sessionStorage`.

## Local Validation

| Check | Result |
| --- | --- |
| `pnpm lint` | Passed |
| `pnpm test` | Passed: 3 files, 15 tests |
| `pnpm check:worker` | Passed |
| Production-flagged `pnpm build` | Passed |
| Astro Check | 0 errors, 0 warnings, 0 hints |
| Jampack | 720 files, 36.67 MiB to 28.84 MiB |
| Targeted Prettier | Passed |
| `git diff --check` | Passed |

The tests cover public read-only session discovery, exact owner rejection,
same-origin cookie issuance, preview bearer fallback, invalid OAuth returns,
origin enforcement, and CSRF rejection. Existing informational Browserslist
and Shiki language warnings remain unchanged.

## Rollback

- Remove the two custom Worker routes and redeploy the last known-good Worker
  version if same-origin API routing fails.
- Restore the frontend `PUBLIC_COMMENTS_API_URL` behavior by deploying the prior
  Pages build.
- Restore the OAuth App callback to the prior `workers.dev` callback only if
  the frontend is also rolled back to the prior bearer flow.
- Keep `rowan-blog-comments` on `workers.dev` during the observation period.
- Keep `.github/workflows/deploy.yml` and `origin/gh-pages` intact.
- Do not delete or modify GitHub Discussions as part of rollback.

## Outcome

All Phase 3 exit criteria passed. Public annotation reads are same-origin and
read-only, only `llccing` receives write capability, OAuth returns to an exact
normalized path, the production session is not exposed to client storage or
URLs, and Giscus behavior remains unchanged.
