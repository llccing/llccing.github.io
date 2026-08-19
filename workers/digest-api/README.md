# Digest Worker

This Worker owns Digest source fetching and model orchestration. GitHub Actions
still owns local deduplication state, Markdown rendering, content validation,
commit, and push.

## Local Checks

```sh
pnpm exec tsc --noEmit -p workers/digest-api/tsconfig.json
pnpm exec vitest run workers/digest-api/test
pnpm exec wrangler deploy --dry-run --config workers/digest-api/wrangler.jsonc
```

## Deployment

Deploy from the repository root:

```sh
pnpm exec wrangler deploy --config workers/digest-api/wrangler.jsonc
pnpm exec wrangler secret put GITHUB_TOKEN --config workers/digest-api/wrangler.jsonc
pnpm exec wrangler secret put DIGEST_PRIMARY_API_KEY --config workers/digest-api/wrangler.jsonc
pnpm exec wrangler secret put DIGEST_PRIMARY_BASE_URL --config workers/digest-api/wrangler.jsonc
pnpm exec wrangler secret put DIGEST_FALLBACK_API_KEY --config workers/digest-api/wrangler.jsonc
pnpm exec wrangler secret put DIGEST_FALLBACK_BASE_URL --config workers/digest-api/wrangler.jsonc
pnpm exec wrangler secret put DIGEST_TRIGGER_TOKEN --config workers/digest-api/wrangler.jsonc
```

The primary and fallback secrets should belong to different providers. The
Worker attempts the primary provider three times, then the fallback provider
three times. HTTP 401 and 403 stop retries for that provider; timeouts, 429,
5xx responses, empty responses, and invalid Markdown are retryable.

Set these GitHub repository secrets only after a successful canary:

- `DIGEST_WORKER_URL`: the deployed Worker URL
- `DIGEST_TRIGGER_TOKEN`: the same value as the Worker secret
- `DIGEST_BACKEND`: `worker`

Leaving `DIGEST_BACKEND` unset keeps the GitHub Action on the existing local
implementation as the rollback path.
