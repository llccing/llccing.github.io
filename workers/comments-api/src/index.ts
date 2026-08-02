import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import {
  COMMENT_LIMITS,
  buildAnnotationCommentBody,
  isAnnotationAnchor,
  normalizeArticlePath,
  parseAnnotationMetadata,
  type AnnotationThread,
  type CommentAuthor,
  type CommentListResponse,
  type CommentReply,
} from "../../../src/comments/protocol";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_API_VERSION = "2022-11-28";
const MAX_REQUEST_BYTES = 24_000;
const SESSION_AUDIENCE = "rowan-comments-owner";
const STATE_AUDIENCE = "rowan-comments-oauth-state";

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string
  ) {
    super(message);
  }
}

type GitHubAuthor = {
  login: string;
  avatarUrl: string;
  url: string;
} | null;

type GitHubReply = {
  id: string;
  body: string;
  bodyHTML: string;
  createdAt: string;
  updatedAt: string;
  author: GitHubAuthor;
};

type GitHubComment = GitHubReply & {
  url: string;
  replies: {
    nodes: GitHubReply[];
    pageInfo: { hasNextPage: boolean };
  };
};

type DiscussionSummary = {
  id: string;
  number: number;
  title: string;
  url: string;
};

type DiscussionPage = {
  repository: {
    discussions: {
      nodes: DiscussionSummary[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
};

type CommentPage = {
  node: (DiscussionSummary & {
    comments: {
      nodes: GitHubComment[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }) | null;
};

type CommentResource = {
  node: (GitHubComment & {
    discussion: DiscussionSummary & {
      repository: { nameWithOwner: string };
    };
  }) | null;
};

const anchorSchema = z
  .object({
    blockId: z.string().min(1).max(180),
    headingId: z.string().max(180).nullable(),
    exact: z.string().min(1).max(COMMENT_LIMITS.exact),
    prefix: z.string().max(COMMENT_LIMITS.context),
    suffix: z.string().max(COMMENT_LIMITS.context),
    view: z.enum(["article", "translated", "original"]),
  })
  .refine(isAnnotationAnchor);

const createCommentSchema = z.object({
  path: z.string().refine(value => normalizeArticlePath(value) === value),
  articleTitle: z.string().min(1).max(COMMENT_LIMITS.articleTitle),
  body: z.string().trim().min(1).max(COMMENT_LIMITS.body),
  anchor: anchorSchema.optional(),
  replyToId: z.string().min(1).max(200).optional(),
});

const updateCommentSchema = z.object({
  body: z.string().trim().min(1).max(COMMENT_LIMITS.body),
});

function allowedOrigins(env: Env): Set<string> {
  return new Set(
    env.ALLOWED_ORIGINS.split(",")
      .map(origin => origin.trim())
      .filter(Boolean)
  );
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });
  const origin = request.headers.get("Origin");
  if (origin && allowedOrigins(env).has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function jsonResponse(
  request: Request,
  env: Env,
  value: unknown,
  init: ResponseInit = {}
): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  for (const [name, headerValue] of corsHeaders(request, env)) {
    headers.set(name, headerValue);
  }
  return Response.json(value, { ...init, headers });
}

function requireAllowedOrigin(request: Request, env: Env): void {
  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigins(env).has(origin)) {
    throw new HttpError(403, "Origin is not allowed", "origin_not_allowed");
  }
}

type SecretName =
  | "GITHUB_TOKEN"
  | "GITHUB_OAUTH_CLIENT_ID"
  | "GITHUB_OAUTH_CLIENT_SECRET"
  | "SESSION_SECRET";

function requireSecret(env: Env, name: SecretName): string {
  const value = (env as unknown as Record<string, unknown>)[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(
      503,
      `Worker secret ${name} is not configured`,
      "setup_required"
    );
  }
  return value;
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel("request body too large");
        throw new HttpError(413, "Request body is too large", "body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "Request body must be JSON", "invalid_json");
  }
}

async function githubGraphQL<T>(
  env: Env,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const githubToken = requireSecret(env, "GITHUB_TOKEN");
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      "User-Agent": "rowan-blog-comments-worker",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new HttpError(502, "GitHub request failed", "github_http_error");
  }
  if (!payload || typeof payload !== "object") {
    throw new HttpError(502, "GitHub returned invalid JSON", "github_bad_json");
  }
  const result = payload as { data?: T; errors?: { message?: string }[] };
  if (result.errors?.length || !result.data) {
    console.error(
      JSON.stringify({
        message: "github_graphql_error",
        errors: result.errors?.map(error => error.message ?? "unknown"),
      })
    );
    throw new HttpError(502, "GitHub GraphQL request failed", "github_error");
  }
  return result.data;
}

async function findDiscussion(
  env: Env,
  path: string
): Promise<DiscussionSummary | null> {
  const query = `
    query FindDiscussion($owner: String!, $repo: String!, $categoryId: ID!, $after: String) {
      repository(owner: $owner, name: $repo) {
        discussions(first: 50, after: $after, categoryId: $categoryId, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes { id number title url }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;
  let after: string | null = null;
  for (let page = 0; page < 10; page += 1) {
    const data: DiscussionPage = await githubGraphQL<DiscussionPage>(env, query, {
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      categoryId: env.GITHUB_CATEGORY_ID,
      after,
    });
    const discussions = data.repository?.discussions;
    if (!discussions) return null;
    const match = discussions.nodes.find(
      discussion => normalizeArticlePath(discussion.title) === path
    );
    if (match) return match;
    if (!discussions.pageInfo.hasNextPage) return null;
    after = discussions.pageInfo.endCursor;
  }
  throw new HttpError(503, "Discussion index is too large", "discussion_limit");
}

function mapAuthor(author: GitHubAuthor): CommentAuthor {
  return author ?? {
    login: "ghost",
    avatarUrl: "https://github.com/ghost.png",
    url: "https://github.com/ghost",
  };
}

function mapReply(reply: GitHubReply): CommentReply {
  return {
    id: reply.id,
    bodyHtml: reply.bodyHTML,
    bodyText: reply.body,
    createdAt: reply.createdAt,
    updatedAt: reply.updatedAt,
    author: mapAuthor(reply.author),
  };
}

async function loadComments(
  env: Env,
  discussion: DiscussionSummary,
  path: string
): Promise<{ threads: AnnotationThread[]; truncated: boolean }> {
  const query = `
    query DiscussionComments($id: ID!, $after: String) {
      node(id: $id) {
        ... on Discussion {
          id number title url
          comments(first: 50, after: $after) {
            nodes {
              id url body bodyHTML createdAt updatedAt
              author { login avatarUrl url }
              replies(first: 50) {
                nodes { id body bodyHTML createdAt updatedAt author { login avatarUrl url } }
                pageInfo { hasNextPage }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    }
  `;
  const comments: GitHubComment[] = [];
  let after: string | null = null;
  let truncated = false;

  for (let page = 0; page < 10; page += 1) {
    const data: CommentPage = await githubGraphQL<CommentPage>(env, query, {
      id: discussion.id,
      after,
    });
    if (!data.node) break;
    comments.push(...data.node.comments.nodes);
    if (data.node.comments.nodes.some(comment => comment.replies.pageInfo.hasNextPage)) {
      truncated = true;
    }
    if (!data.node.comments.pageInfo.hasNextPage) break;
    after = data.node.comments.pageInfo.endCursor;
    if (page === 9) truncated = true;
  }

  const threads = comments.flatMap<AnnotationThread>(comment => {
    const metadata = parseAnnotationMetadata(comment.body);
    if (
      !metadata ||
      metadata.path !== path ||
      comment.author?.login !== env.OWNER_LOGIN
    ) {
      return [];
    }
    return [
      {
        id: comment.id,
        url: comment.url,
        bodyHtml: comment.bodyHTML,
        bodyText: comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: mapAuthor(comment.author),
        anchor: metadata.anchor,
        replies: comment.replies.nodes
          .filter(
            reply =>
              reply.author?.login === env.OWNER_LOGIN ||
              reply.author?.login === "github-actions" ||
              reply.author?.login === "github-actions[bot]"
          )
          .map(mapReply),
      },
    ];
  });
  return { threads, truncated };
}

async function getCommentList(
  env: Env,
  path: string
): Promise<CommentListResponse> {
  const discussion = await findDiscussion(env, path);
  if (!discussion) return { discussion: null, threads: [], truncated: false };
  const { threads, truncated } = await loadComments(env, discussion, path);
  return { discussion, threads, truncated };
}

async function createDiscussion(
  env: Env,
  path: string,
  articleTitle: string
): Promise<DiscussionSummary> {
  const query = `
    mutation CreateDiscussion($input: CreateDiscussionInput!) {
      createDiscussion(input: $input) {
        discussion { id number title url }
      }
    }
  `;
  const data = await githubGraphQL<{
    createDiscussion: { discussion: DiscussionSummary } | null;
  }>(env, query, {
    input: {
      repositoryId: env.GITHUB_REPO_ID,
      categoryId: env.GITHUB_CATEGORY_ID,
      title: path.replace(/^\//, ""),
      body: `## ${articleTitle}\n\n[在博客中查看](${env.SITE_URL}${path})`,
    },
  });
  if (!data.createDiscussion?.discussion) {
    throw new HttpError(502, "GitHub did not create the discussion", "create_failed");
  }
  return data.createDiscussion.discussion;
}

async function getCommentResource(env: Env, id: string): Promise<CommentResource["node"]> {
  const query = `
    query CommentResource($id: ID!) {
      node(id: $id) {
        ... on DiscussionComment {
          id url body bodyHTML createdAt updatedAt
          author { login avatarUrl url }
          replies(first: 50) {
            nodes { id body bodyHTML createdAt updatedAt author { login avatarUrl url } }
            pageInfo { hasNextPage }
          }
          discussion {
            id number title url
            repository { nameWithOwner }
          }
        }
      }
    }
  `;
  const data = await githubGraphQL<CommentResource>(env, query, { id });
  const resource = data.node;
  if (
    !resource ||
    resource.author?.login !== env.OWNER_LOGIN ||
    resource.discussion.repository.nameWithOwner !==
      `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`
  ) {
    throw new HttpError(404, "Comment was not found", "comment_not_found");
  }
  return resource;
}

async function addDiscussionComment(
  env: Env,
  discussionId: string,
  body: string,
  replyToId?: string
): Promise<GitHubComment> {
  const query = `
    mutation AddComment($input: AddDiscussionCommentInput!) {
      addDiscussionComment(input: $input) {
        comment {
          id url body bodyHTML createdAt updatedAt
          author { login avatarUrl url }
          replies(first: 50) {
            nodes { id body bodyHTML createdAt updatedAt author { login avatarUrl url } }
            pageInfo { hasNextPage }
          }
        }
      }
    }
  `;
  const data = await githubGraphQL<{
    addDiscussionComment: { comment: GitHubComment } | null;
  }>(env, query, {
    input: { discussionId, body, ...(replyToId ? { replyToId } : {}) },
  });
  if (!data.addDiscussionComment?.comment) {
    throw new HttpError(502, "GitHub did not create the comment", "create_failed");
  }
  return data.addDiscussionComment.comment;
}

async function updateDiscussionComment(
  env: Env,
  id: string,
  body: string
): Promise<GitHubComment> {
  const query = `
    mutation UpdateComment($input: UpdateDiscussionCommentInput!) {
      updateDiscussionComment(input: $input) {
        comment {
          id url body bodyHTML createdAt updatedAt
          author { login avatarUrl url }
          replies(first: 50) {
            nodes { id body bodyHTML createdAt updatedAt author { login avatarUrl url } }
            pageInfo { hasNextPage }
          }
        }
      }
    }
  `;
  const data = await githubGraphQL<{
    updateDiscussionComment: { comment: GitHubComment } | null;
  }>(env, query, { input: { commentId: id, body } });
  if (!data.updateDiscussionComment?.comment) {
    throw new HttpError(502, "GitHub did not update the comment", "update_failed");
  }
  return data.updateDiscussionComment.comment;
}

async function deleteDiscussionComment(env: Env, id: string): Promise<void> {
  const query = `
    mutation DeleteComment($input: DeleteDiscussionCommentInput!) {
      deleteDiscussionComment(input: $input) { clientMutationId }
    }
  `;
  await githubGraphQL(env, query, { input: { id } });
}

function sessionKey(env: Env): Uint8Array {
  return new TextEncoder().encode(requireSecret(env, "SESSION_SECRET"));
}

async function signSession(env: Env, login: string): Promise<string> {
  return new SignJWT({ login })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(login)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(sessionKey(env));
}

async function requireOwnerSession(request: Request, env: Env): Promise<string> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "Owner session is required", "unauthorized");
  }
  try {
    const { payload } = await jwtVerify(
      authorization.slice("Bearer ".length),
      sessionKey(env),
      { audience: SESSION_AUDIENCE }
    );
    if (payload.sub !== env.OWNER_LOGIN || payload.login !== env.OWNER_LOGIN) {
      throw new Error("owner mismatch");
    }
    return env.OWNER_LOGIN;
  } catch {
    throw new HttpError(401, "Owner session is invalid", "unauthorized");
  }
}

async function handleOAuthStart(request: Request, env: Env): Promise<Response> {
  const oauthClientId = requireSecret(env, "GITHUB_OAUTH_CLIENT_ID");
  requireSecret(env, "SESSION_SECRET");
  const url = new URL(request.url);
  const origin = url.searchParams.get("origin");
  if (!origin || !allowedOrigins(env).has(origin)) {
    throw new HttpError(400, "OAuth origin is invalid", "invalid_origin");
  }
  const returnToValue = url.searchParams.get("returnTo");
  let returnTo: URL;
  try {
    if (!returnToValue) throw new Error("missing return URL");
    returnTo = new URL(returnToValue);
    if (
      returnTo.origin !== origin ||
      normalizeArticlePath(returnTo.pathname) !== returnTo.pathname
    ) {
      throw new Error("invalid return URL");
    }
    returnTo.hash = "";
  } catch {
    throw new HttpError(400, "OAuth return URL is invalid", "invalid_return_url");
  }
  const state = await new SignJWT({
    origin,
    returnTo: returnTo.toString(),
    nonce: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience(STATE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(sessionKey(env));
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", oauthClientId);
  authorize.searchParams.set("redirect_uri", `${url.origin}/auth/github/callback`);
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", state);
  return Response.redirect(authorize.toString(), 302);
}

async function handleOAuthCallback(request: Request, env: Env): Promise<Response> {
  const oauthClientId = requireSecret(env, "GITHUB_OAUTH_CLIENT_ID");
  const oauthClientSecret = requireSecret(env, "GITHUB_OAUTH_CLIENT_SECRET");
  requireSecret(env, "SESSION_SECRET");
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    throw new HttpError(400, "OAuth callback is incomplete", "oauth_invalid");
  }

  let returnTo: URL;
  try {
    const { payload } = await jwtVerify(state, sessionKey(env), {
      audience: STATE_AUDIENCE,
    });
    if (typeof payload.origin !== "string" || !allowedOrigins(env).has(payload.origin)) {
      throw new Error("origin mismatch");
    }
    if (typeof payload.returnTo !== "string") {
      throw new Error("return URL missing");
    }
    returnTo = new URL(payload.returnTo);
    if (
      returnTo.origin !== payload.origin ||
      normalizeArticlePath(returnTo.pathname) !== returnTo.pathname
    ) {
      throw new Error("return URL mismatch");
    }
    returnTo.hash = "";
  } catch {
    throw new HttpError(400, "OAuth state is invalid", "oauth_invalid");
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: oauthClientId,
      client_secret: oauthClientSecret,
      code,
      redirect_uri: `${url.origin}/auth/github/callback`,
    }),
  });
  const tokenPayload: unknown = await tokenResponse.json();
  if (
    !tokenResponse.ok ||
    !tokenPayload ||
    typeof tokenPayload !== "object" ||
    typeof (tokenPayload as { access_token?: unknown }).access_token !== "string"
  ) {
    throw new HttpError(401, "GitHub OAuth exchange failed", "oauth_failed");
  }

  const accessToken = (tokenPayload as { access_token: string }).access_token;
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "rowan-blog-comments-worker",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });
  const userPayload: unknown = await userResponse.json();
  const login =
    userPayload && typeof userPayload === "object"
      ? (userPayload as { login?: unknown }).login
      : null;
  if (!userResponse.ok || login !== env.OWNER_LOGIN) {
    throw new HttpError(403, "This GitHub account cannot write comments", "forbidden");
  }

  const token = await signSession(env, env.OWNER_LOGIN);
  returnTo.hash = `rowan-comments-auth=${encodeURIComponent(token)}`;
  return new Response(null, {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
      Location: returnTo.toString(),
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cacheRequest(request: Request, path: string): Request {
  const url = new URL(request.url);
  url.pathname = "/__cache/comments";
  url.search = new URLSearchParams({ path }).toString();
  return new Request(url.toString(), { method: "GET" });
}

async function invalidateCommentCache(request: Request, path: string): Promise<void> {
  await caches.default.delete(cacheRequest(request, path));
}

async function handleGetComments(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = normalizeArticlePath(url.searchParams.get("path") ?? "");
  if (!path) throw new HttpError(400, "Article path is invalid", "invalid_path");

  const key = cacheRequest(request, path);
  const cached = await caches.default.match(key);
  if (cached) {
    const response = new Response(cached.body, cached);
    response.headers.delete("Access-Control-Allow-Origin");
    for (const [name, value] of corsHeaders(request, env)) response.headers.set(name, value);
    response.headers.set("X-Comments-Cache", "HIT");
    return response;
  }

  const value = await getCommentList(env, path);
  const response = jsonResponse(request, env, value, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
  });
  const cachedResponse = Response.json(value, {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
  ctx.waitUntil(caches.default.put(key, cachedResponse));
  response.headers.set("X-Comments-Cache", "MISS");
  return response;
}

async function handleCreateComment(request: Request, env: Env): Promise<Response> {
  requireAllowedOrigin(request, env);
  await requireOwnerSession(request, env);
  const input = createCommentSchema.safeParse(await readJson(request));
  if (!input.success) {
    throw new HttpError(400, "Comment input is invalid", "invalid_comment");
  }

  let discussion = await findDiscussion(env, input.data.path);
  if (!discussion) {
    discussion = await createDiscussion(env, input.data.path, input.data.articleTitle);
  }

  let commentBody = input.data.body;
  if (input.data.replyToId) {
    const parent = await getCommentResource(env, input.data.replyToId);
    if (parent?.discussion.id !== discussion.id) {
      throw new HttpError(400, "Reply target is invalid", "invalid_reply");
    }
  } else {
    if (!input.data.anchor) {
      throw new HttpError(400, "Annotation anchor is required", "anchor_required");
    }
    commentBody = buildAnnotationCommentBody(
      { version: 1, path: input.data.path, anchor: input.data.anchor },
      input.data.body
    );
  }

  const comment = await addDiscussionComment(
    env,
    discussion.id,
    commentBody,
    input.data.replyToId
  );
  await invalidateCommentCache(request, input.data.path);
  return jsonResponse(request, env, { comment }, { status: 201 });
}

async function handleUpdateComment(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  requireAllowedOrigin(request, env);
  await requireOwnerSession(request, env);
  const input = updateCommentSchema.safeParse(await readJson(request));
  if (!input.success) {
    throw new HttpError(400, "Comment input is invalid", "invalid_comment");
  }
  const resource = await getCommentResource(env, id);
  if (!resource) throw new HttpError(404, "Comment was not found", "comment_not_found");
  const metadata = parseAnnotationMetadata(resource.body);
  const body = metadata
    ? buildAnnotationCommentBody(metadata, input.data.body)
    : input.data.body;
  const comment = await updateDiscussionComment(env, id, body);
  const path = normalizeArticlePath(resource.discussion.title);
  if (path) await invalidateCommentCache(request, path);
  return jsonResponse(request, env, { comment });
}

async function handleDeleteComment(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  requireAllowedOrigin(request, env);
  await requireOwnerSession(request, env);
  const resource = await getCommentResource(env, id);
  await deleteDiscussionComment(env, id);
  const path = normalizeArticlePath(resource?.discussion.title ?? "");
  if (path) await invalidateCommentCache(request, path);
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

async function routeRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }
  if (request.method === "GET" && url.pathname === "/health") {
    return jsonResponse(request, env, { ok: true, service: "rowan-blog-comments" });
  }
  if (request.method === "GET" && url.pathname === "/auth/github/start") {
    return handleOAuthStart(request, env);
  }
  if (request.method === "GET" && url.pathname === "/auth/github/callback") {
    return handleOAuthCallback(request, env);
  }
  if (request.method === "GET" && url.pathname === "/api/comments") {
    return handleGetComments(request, env, ctx);
  }
  if (request.method === "GET" && url.pathname === "/api/owner/session") {
    const login = await requireOwnerSession(request, env);
    return jsonResponse(request, env, { canWrite: true, login });
  }
  if (request.method === "POST" && url.pathname === "/api/owner/comments") {
    return handleCreateComment(request, env);
  }
  const commentMatch = url.pathname.match(/^\/api\/owner\/comments\/([^/]+)$/);
  if (commentMatch && request.method === "PATCH") {
    return handleUpdateComment(request, env, decodeURIComponent(commentMatch[1]));
  }
  if (commentMatch && request.method === "DELETE") {
    return handleDeleteComment(request, env, decodeURIComponent(commentMatch[1]));
  }
  throw new HttpError(404, "Route was not found", "not_found");
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      return await routeRequest(request, env, ctx);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : "internal_error";
      const message =
        error instanceof HttpError ? error.message : "Internal server error";
      console.error(
        JSON.stringify({
          message: "request_failed",
          method: request.method,
          path: new URL(request.url).pathname,
          status,
          code,
          error: error instanceof Error ? error.message : String(error),
        })
      );
      return jsonResponse(request, env, { error: { code, message } }, { status });
    }
  },
} satisfies ExportedHandler<Env>;
