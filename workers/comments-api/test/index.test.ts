import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAnnotationCommentBody, type AnnotationMetadata } from "../../../src/comments/protocol";
import worker, { scheduleGitHubMirror } from "../src/index";

const articlePath = "/posts/example/";
const discussionTitle = "posts/example/";
const metadata: AnnotationMetadata = {
  version: 1,
  path: articlePath,
  anchor: {
    blockId: "cb-article-abc",
    headingId: "article",
    exact: "被批注的句子",
    prefix: "",
    suffix: "",
    view: "article",
  },
};

function readDatabase() {
  const annotation = {
    id: "annotation",
    article_path: articlePath,
    author_login: "llccing",
    author_avatar_url: "https://github.com/llccing.png",
    author_url: "https://github.com/llccing",
    body: buildAnnotationCommentBody(metadata, "这是一条批注"),
    github_url: "https://github.com/annotation",
    block_id: metadata.anchor.blockId,
    heading_id: metadata.anchor.headingId,
    exact_text: metadata.anchor.exact,
    prefix_text: metadata.anchor.prefix,
    suffix_text: metadata.anchor.suffix,
    view: metadata.anchor.view,
    github_node_id: "DC_1",
    github_mirror_state: "synced",
    created_at: "2026-08-02T00:00:00Z",
    updated_at: "2026-08-02T00:00:00Z",
  };
  const reply = {
    id: "ai-reply",
    annotation_id: annotation.id,
    article_path: articlePath,
    author_login: "github-actions",
    author_avatar_url: "",
    author_url: "",
    body: "<!-- rowan-ai-reply:v1 annotation -->\n\nAI 回答",
    github_url: "https://github.com/reply",
    github_node_id: "DC_2",
    github_mirror_state: "synced",
    created_at: "2026-08-02T00:01:00Z",
    updated_at: "2026-08-02T00:01:00Z",
  };
  return {
    prepare(sql: string) {
      return {
        bind() {
          return {
            first: async () =>
              sql.includes("FROM articles")
                ? {
                    path: articlePath,
                    title: discussionTitle,
                    github_discussion_id: "D_1",
                    github_discussion_number: 1,
                    github_url: "https://github.com/discussion/1",
                    version: 4,
                  }
                : null,
            all: async () => ({
              results: sql.includes("FROM annotations")
                ? [annotation]
                : sql.includes("FROM replies")
                  ? [reply]
                  : [],
            }),
          };
        },
      };
    },
  } as unknown as D1Database;
}

const env = {
  GITHUB_OWNER: "llccing",
  GITHUB_REPO: "llccing.github.io",
  GITHUB_REPO_ID: "R_kgDOL98uEQ",
  GITHUB_CATEGORY_ID: "DIC_kwDOL98uEc4C7B0s",
  OWNER_LOGIN: "llccing",
  SITE_URL: "https://rowanliu.com",
  ALLOWED_ORIGINS: "https://rowanliu.com,http://localhost:4321",
  GITHUB_TOKEN: "test-token",
  GITHUB_OAUTH_CLIENT_ID: "test-client-id",
  GITHUB_OAUTH_CLIENT_SECRET: "test-client-secret",
  SESSION_SECRET: "test-session-secret-that-is-long-enough",
  ANNOTATIONS_DB: readDatabase(),
};

const ctx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
};

function githubResponse(data: unknown): Response {
  return Response.json({ data });
}

describe("comments Worker", () => {
  beforeEach(() => {
    vi.stubGlobal("caches", {
      default: {
        match: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(true),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reports health without requiring secrets", async () => {
    const response = await worker.fetch(
      new Request("https://comments.example/health"),
      env as never,
      ctx as never
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "rowan-blog-comments",
    });
  });

  it("reports a public read-only session without a browser error", async () => {
    const response = await worker.fetch(
      new Request("https://rowanliu.com/api/owner/session"),
      env as never,
      ctx as never
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ canWrite: false });
  });

  it("returns D1 annotations without calling GitHub and supports conditional reads", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      new Request(`https://comments.example/api/comments?path=${encodeURIComponent(articlePath)}`, {
        headers: { Origin: "https://rowanliu.com" },
      }),
      env as never,
      ctx as never
    );
    const payload = (await response.json()) as {
      threads: { id: string; replies: { id: string }[] }[];
    };

    expect(response.status).toBe(200);
    expect(payload.threads.map(thread => thread.id)).toEqual(["annotation"]);
    expect(payload.threads[0].replies.map(reply => reply.id)).toEqual(["ai-reply"]);
    expect(payload.threads[0].replies.map(reply => reply.id)).toEqual(["ai-reply"]);
    expect(response.headers.get("ETag")).toBe('"comments-4"');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://rowanliu.com");

    const unchanged = await worker.fetch(
      new Request(
        `https://comments.example/api/comments?path=${encodeURIComponent(articlePath)}`,
        { headers: { "If-None-Match": '"comments-4"' } }
      ),
      env as never,
      ctx as never
    );
    expect(unchanged.status).toBe(304);
  });

  it("contains an asynchronous GitHub mirror failure after D1 success", async () => {
    const waitUntil = vi.fn();
    const run = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
    const mirrorEnv = {
      ...env,
      ANNOTATIONS_DB: {
        prepare: () => ({ bind: () => ({ run }) }),
      } as unknown as D1Database,
    };
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    scheduleGitHubMirror(
      { ...ctx, waitUntil } as never,
      mirrorEnv as never,
      {
        kind: "annotation",
        id: "d1-id",
        articlePath,
        annotationId: "d1-id",
        body: "body",
        githubNodeId: null,
        githubMirrorState: "pending",
        anchor: metadata.anchor,
      },
      () => Promise.reject(new Error("GitHub unavailable"))
    );
    expect(waitUntil).toHaveBeenCalledOnce();
    await expect(waitUntil.mock.calls[0][0]).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledOnce();
    expect(JSON.parse(error.mock.calls.at(-1)?.[0] as string)).toMatchObject({
      message: "github_mirror_failed",
      resourceId: "d1-id",
      articlePath,
      error: "GitHub unavailable",
    });
  });

  it("rejects owner mutations from an unapproved origin before GitHub access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await worker.fetch(
      new Request("https://comments.example/api/owner/comments", {
        method: "POST",
        headers: { Origin: "https://attacker.example", "Content-Type": "application/json" },
        body: "{}",
      }),
      env as never,
      ctx as never
    );
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an owner session to the validated article URL", async () => {
    const returnTo = "http://localhost:4321/posts/example/?annotate=1";
    const startResponse = await worker.fetch(
      new Request(
        `https://comments.example/auth/github/start?origin=${encodeURIComponent("http://localhost:4321")}&returnTo=${encodeURIComponent(returnTo)}`
      ),
      env as never,
      ctx as never
    );
    const authorizeUrl = new URL(startResponse.headers.get("Location") ?? "");
    const state = authorizeUrl.searchParams.get("state");
    expect(startResponse.status).toBe(302);
    expect(authorizeUrl.origin).toBe("https://github.com");
    expect(authorizeUrl.searchParams.get("redirect_uri")).toBe(
      "https://rowanliu.com/auth/github/callback"
    );
    expect(state).toBeTruthy();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "github-user-token" }))
      .mockResolvedValueOnce(Response.json({ login: "llccing" }));
    vi.stubGlobal("fetch", fetchMock);
    const callbackResponse = await worker.fetch(
      new Request(
        `https://rowanliu.com/auth/github/callback?code=test-code&state=${encodeURIComponent(state ?? "")}`
      ),
      env as never,
      ctx as never
    );
    const callbackUrl = new URL(callbackResponse.headers.get("Location") ?? "");
    expect(callbackResponse.status).toBe(302);
    expect(callbackResponse.headers.get("Cache-Control")).toBe("no-store");
    expect(`${callbackUrl.origin}${callbackUrl.pathname}${callbackUrl.search}`).toBe(
      returnTo
    );
    expect(callbackUrl.hash).toMatch(/^#rowan-comments-auth=eyJ/);
  });

  it("rejects a signed-in GitHub account other than the exact owner", async () => {
    const returnTo = "https://rowanliu.com/annotations/";
    const startResponse = await worker.fetch(
      new Request(
        `https://rowanliu.com/auth/github/start?origin=${encodeURIComponent("https://rowanliu.com")}&returnTo=${encodeURIComponent(returnTo)}`
      ),
      env as never,
      ctx as never
    );
    const state = new URL(startResponse.headers.get("Location") ?? "").searchParams.get(
      "state"
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "github-user-token" }))
      .mockResolvedValueOnce(Response.json({ login: "someone-else" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      new Request(
        `https://rowanliu.com/auth/github/callback?code=test-code&state=${encodeURIComponent(state ?? "")}`
      ),
      env as never,
      ctx as never
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("Set-Cookie")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "forbidden" },
    });
  });

  it("uses an HTTP-only cookie for the same-origin OAuth callback", async () => {
    const returnTo = "https://rowanliu.com/annotations/";
    const startResponse = await worker.fetch(
      new Request(
        `https://rowanliu.com/auth/github/start?origin=${encodeURIComponent("https://rowanliu.com")}&returnTo=${encodeURIComponent(returnTo)}`
      ),
      env as never,
      ctx as never
    );
    const state = new URL(startResponse.headers.get("Location") ?? "").searchParams.get(
      "state"
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "github-user-token" }))
      .mockResolvedValueOnce(Response.json({ login: "llccing" }));
    vi.stubGlobal("fetch", fetchMock);

    const callbackResponse = await worker.fetch(
      new Request(
        `https://rowanliu.com/auth/github/callback?code=test-code&state=${encodeURIComponent(state ?? "")}`
      ),
      env as never,
      ctx as never
    );
    const cookie = callbackResponse.headers.get("Set-Cookie") ?? "";
    const sessionToken = cookie.match(/__Host-rowan-comments-owner=([^;]+)/)?.[1];

    expect(callbackResponse.headers.get("Location")).toBe(returnTo);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(sessionToken).toBeTruthy();

    const sessionResponse = await worker.fetch(
      new Request("https://rowanliu.com/api/owner/session", {
        headers: { Cookie: `__Host-rowan-comments-owner=${sessionToken}` },
      }),
      env as never,
      ctx as never
    );
    const session = (await sessionResponse.json()) as {
      canWrite: boolean;
      login: string;
      csrfToken: string;
    };
    expect(session).toMatchObject({ canWrite: true, login: "llccing" });
    expect(session.csrfToken).toBeTruthy();
  });

  it("requires CSRF validation for cookie-authenticated mutations", async () => {
    const tokenResponse = await worker.fetch(
      new Request(
        `https://comments.example/auth/github/start?origin=${encodeURIComponent("https://rowanliu.com")}&returnTo=${encodeURIComponent("https://rowanliu.com/annotations/")}`
      ),
      env as never,
      ctx as never
    );
    const state = new URL(tokenResponse.headers.get("Location") ?? "").searchParams.get(
      "state"
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "github-user-token" }))
      .mockResolvedValueOnce(Response.json({ login: "llccing" }));
    vi.stubGlobal("fetch", fetchMock);
    const callbackResponse = await worker.fetch(
      new Request(
        `https://rowanliu.com/auth/github/callback?code=test-code&state=${encodeURIComponent(state ?? "")}`
      ),
      env as never,
      ctx as never
    );
    const cookie = callbackResponse.headers.get("Set-Cookie") ?? "";
    const sessionToken = cookie.match(/__Host-rowan-comments-owner=([^;]+)/)?.[1];

    const response = await worker.fetch(
      new Request("https://rowanliu.com/api/owner/comments", {
        method: "POST",
        headers: {
          Cookie: `__Host-rowan-comments-owner=${sessionToken}`,
          Origin: "https://rowanliu.com",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
      env as never,
      ctx as never
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "csrf_invalid" },
    });
  });

  it("rejects an OAuth return URL on another origin", async () => {
    const response = await worker.fetch(
      new Request(
        `https://comments.example/auth/github/start?origin=${encodeURIComponent("https://rowanliu.com")}&returnTo=${encodeURIComponent("https://attacker.example/posts/example/?annotate=1")}`
      ),
      env as never,
      ctx as never
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_return_url" },
    });
  });

  it("rejects an OAuth return URL that is not an article", async () => {
    const response = await worker.fetch(
      new Request(
        `https://comments.example/auth/github/start?origin=${encodeURIComponent("https://rowanliu.com")}&returnTo=${encodeURIComponent("https://rowanliu.com/about/?annotate=1")}`
      ),
      env as never,
      ctx as never
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_return_url" },
    });
  });
});
