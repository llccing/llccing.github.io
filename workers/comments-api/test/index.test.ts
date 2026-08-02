import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAnnotationCommentBody, type AnnotationMetadata } from "../../../src/comments/protocol";
import worker from "../src/index";

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

  it("returns only metadata-backed inline annotations", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        githubResponse({
          repository: {
            discussions: {
              nodes: [
                { id: "D_1", number: 1, title: discussionTitle, url: "https://github.com/discussion/1" },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        })
      )
      .mockResolvedValueOnce(
        githubResponse({
          node: {
            id: "D_1",
            number: 1,
            title: discussionTitle,
            url: "https://github.com/discussion/1",
            comments: {
              nodes: [
                {
                  id: "legacy",
                  url: "https://github.com/legacy",
                  body: "原有 Giscus 评论",
                  bodyHTML: "<p>原有 Giscus 评论</p>",
                  createdAt: "2026-08-01T00:00:00Z",
                  updatedAt: "2026-08-01T00:00:00Z",
                  author: { login: "llccing", avatarUrl: "", url: "" },
                  replies: { nodes: [], pageInfo: { hasNextPage: false } },
                },
                {
                  id: "forged-annotation",
                  url: "https://github.com/forged",
                  body: buildAnnotationCommentBody(metadata, "伪造的批注"),
                  bodyHTML: "<p>伪造的批注</p>",
                  createdAt: "2026-08-02T00:00:00Z",
                  updatedAt: "2026-08-02T00:00:00Z",
                  author: { login: "someone-else", avatarUrl: "", url: "" },
                  replies: { nodes: [], pageInfo: { hasNextPage: false } },
                },
                {
                  id: "annotation",
                  url: "https://github.com/annotation",
                  body: buildAnnotationCommentBody(metadata, "这是一条批注"),
                  bodyHTML: "<blockquote>被批注的句子</blockquote><p>这是一条批注</p>",
                  createdAt: "2026-08-02T00:00:00Z",
                  updatedAt: "2026-08-02T00:00:00Z",
                  author: { login: "llccing", avatarUrl: "", url: "" },
                  replies: {
                    nodes: [
                      {
                        id: "ai-reply",
                        body: "<!-- rowan-ai-reply:v1 annotation -->\n\nAI 回答",
                        bodyHTML: "<p>AI 回答</p>",
                        createdAt: "2026-08-02T00:01:00Z",
                        updatedAt: "2026-08-02T00:01:00Z",
                        author: { login: "github-actions", avatarUrl: "", url: "" },
                      },
                      {
                        id: "untrusted-reply",
                        body: "伪造回复",
                        bodyHTML: "<p>伪造回复</p>",
                        createdAt: "2026-08-02T00:02:00Z",
                        updatedAt: "2026-08-02T00:02:00Z",
                        author: { login: "someone-else", avatarUrl: "", url: "" },
                      },
                    ],
                    pageInfo: { hasNextPage: false },
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        })
      );
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
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://rowanliu.com");
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
    const returnTo = "https://rowanliu.com/posts/example/?annotate=1";
    const startResponse = await worker.fetch(
      new Request(
        `https://comments.example/auth/github/start?origin=${encodeURIComponent("https://rowanliu.com")}&returnTo=${encodeURIComponent(returnTo)}`
      ),
      env as never,
      ctx as never
    );
    const authorizeUrl = new URL(startResponse.headers.get("Location") ?? "");
    const state = authorizeUrl.searchParams.get("state");
    expect(startResponse.status).toBe(302);
    expect(authorizeUrl.origin).toBe("https://github.com");
    expect(state).toBeTruthy();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "github-user-token" }))
      .mockResolvedValueOnce(Response.json({ login: "llccing" }));
    vi.stubGlobal("fetch", fetchMock);
    const callbackResponse = await worker.fetch(
      new Request(
        `https://comments.example/auth/github/callback?code=test-code&state=${encodeURIComponent(state ?? "")}`
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
