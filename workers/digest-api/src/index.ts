import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { fetchOneSource, filterAndCap, mergePreservedItems } from "./fetch";
import { ModelError, summarize } from "./model";
import { SOURCES } from "./sources";
import type { DigestJobPayload, DigestJobResult, DigestItem } from "./types";

type DigestEnv = {
  DIGEST_WORKFLOW: Workflow<DigestJobPayload>;
  DIGEST_PRIMARY_MODEL: string;
  DIGEST_FALLBACK_MODEL: string;
  GITHUB_TOKEN: string;
  DIGEST_PRIMARY_API_KEY: string;
  DIGEST_PRIMARY_BASE_URL: string;
  DIGEST_FALLBACK_API_KEY: string;
  DIGEST_FALLBACK_BASE_URL: string;
  DIGEST_TRIGGER_TOKEN: string;
};

const json = (value: unknown, init?: ResponseInit) => Response.json(value, { headers: { "cache-control": "no-store" }, ...init });

function authorized(request: Request, env: DigestEnv): boolean {
  return request.headers.get("authorization") === `Bearer ${env.DIGEST_TRIGGER_TOKEN}`;
}

export class DigestWorkflow extends WorkflowEntrypoint<DigestEnv, DigestJobPayload> {
  async run(event: WorkflowEvent<DigestJobPayload>, step: WorkflowStep): Promise<DigestJobResult> {
    const allItems: DigestItem[] = [];
    const failures: Array<{ id: string; message: string }> = [];
    for (const source of SOURCES) {
      const result = await step.do(
        `fetch ${source.id}`,
        { timeout: "2 minutes" },
        async () => {
          try {
            return {
              items: await fetchOneSource(source, this.env.GITHUB_TOKEN),
              error: null,
            };
          } catch (error) {
            return {
              items: [] as DigestItem[],
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }
      );
      allItems.push(...result.items);
      if (result.error) {
        failures.push({ id: source.id, message: result.error });
      }
    }
    if (failures.length > 3) throw new Error(`Too many sources failed (${failures.length}/${SOURCES.length})`);
    const fresh = filterAndCap(allItems, event.payload.seenUrls);
    const fetched = {
      items: mergePreservedItems(event.payload.preservedItems ?? [], fresh),
      failures,
    };

    if (!fetched.items.length) {
      return { date: event.payload.date, items: [], failures: fetched.failures, body: "", provider: "primary", model: this.env.DIGEST_PRIMARY_MODEL };
    }

    const providers = [
      { name: "primary" as const, key: this.env.DIGEST_PRIMARY_API_KEY, baseUrl: this.env.DIGEST_PRIMARY_BASE_URL, model: this.env.DIGEST_PRIMARY_MODEL },
      { name: "fallback" as const, key: this.env.DIGEST_FALLBACK_API_KEY, baseUrl: this.env.DIGEST_FALLBACK_BASE_URL, model: this.env.DIGEST_FALLBACK_MODEL },
    ];
    let lastError: unknown;
    for (const provider of providers) {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const body = await step.do(`summarize ${provider.name} attempt ${attempt}`, { timeout: "3 minutes" }, async () => {
            if (!provider.key || !provider.baseUrl || !provider.model) throw new Error(`${provider.name} provider is not configured`);
            return summarize(fetched.items, event.payload.date, provider.key, provider.baseUrl, provider.model);
          });
          console.log(JSON.stringify({ message: "digest_model_succeeded", provider: provider.name, model: provider.model, attempt, itemCount: fetched.items.length }));
          return { date: event.payload.date, items: fetched.items, failures: fetched.failures, body, provider: provider.name, model: provider.model };
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error);
          const status =
            error instanceof ModelError
              ? error.status
              : Number(message.match(/HTTP (\d{3})/)?.[1]) || undefined;
          console.warn(JSON.stringify({ message: "digest_model_failed", provider: provider.name, model: provider.model, attempt, status, error: error instanceof Error ? error.message : String(error) }));
          if (status === 401 || status === 403 || message.includes("provider is not configured")) break;
          if (attempt < 3) await step.sleep(`backoff ${provider.name} attempt ${attempt}`, `${attempt * 15} seconds`);
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("All digest model providers failed");
  }
}

export default {
  async fetch(request: Request, env: DigestEnv): Promise<Response> {
    if (!authorized(request, env)) return json({ error: "unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/jobs") {
      const payload = await request.json<DigestJobPayload>();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date) || !Array.isArray(payload.seenUrls)) return json({ error: "invalid payload" }, { status: 400 });
      try {
        const suffix = payload.runKey ? `-${payload.runKey.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40)}` : "";
        const instance = await env.DIGEST_WORKFLOW.create({ id: `digest-${payload.date}${suffix}`, params: payload });
        return json({ id: instance.id, status: await instance.status() }, { status: 202 });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, { status: 409 });
      }
    }
    const match = url.pathname.match(/^\/jobs\/([A-Za-z0-9_-]+)$/);
    if (request.method === "GET" && match) {
      try { return json(await (await env.DIGEST_WORKFLOW.get(match[1])).status()); }
      catch { return json({ error: "job not found" }, { status: 404 }); }
    }
    return json({ error: "not found" }, { status: 404 });
  },
};
