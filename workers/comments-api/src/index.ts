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
import {
  annotationMetadata,
  createD1Annotation,
  createD1Reply,
  deleteD1Resource,
  getD1Article,
  getD1CommentList,
  getD1Resource,
  markArticleMirrored,
  markResourceMirrored,
  markResourceMirrorFailed,
  updateD1Resource,
  type D1Resource,
} from "./d1";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_API_VERSION = "2022-11-28";
const MAX_REQUEST_BYTES = 24_000;
const SESSION_AUDIENCE = "rowan-comments-owner";
const STATE_AUDIENCE = "rowan-comments-oauth-state";
const SESSION_COOKIE = "__Host-rowan-comments-owner";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

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
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, If-None-Match, X-CSRF-Token",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });
  const origin = request.headers.get("Origin");
  if (origin && allowedOrigins(env).has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
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
  if (!discussion) return { version: 0, discussion: null, threads: [], truncated: false };
  const { threads, truncated } = await loadComments(env, discussion, path);
  return { version: 0, discussion, threads, truncated };
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

function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [cookieName, ...valueParts] = part.trim().split("=");
    if (cookieName === name) return valueParts.join("=");
  }
  return null;
}

function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function signSession(
  env: Env,
  login: string,
  csrfToken: string
): Promise<string> {
  return new SignJWT({ login, csrfToken })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(login)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(sessionKey(env));
}

type OwnerSession = {
  login: string;
  csrfToken: string | null;
};

async function secretsMatch(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

async function requireOwnerSession(
  request: Request,
  env: Env,
  requireCsrf = false
): Promise<OwnerSession> {
  const authorization = request.headers.get("Authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const cookieToken = readCookie(request, SESSION_COOKIE);
  const token = bearerToken ?? cookieToken;
  if (!token) {
    throw new HttpError(401, "Owner session is required", "unauthorized");
  }
  try {
    const { payload } = await jwtVerify(token, sessionKey(env), {
      audience: SESSION_AUDIENCE,
    });
    if (payload.sub !== env.OWNER_LOGIN || payload.login !== env.OWNER_LOGIN) {
      throw new Error("owner mismatch");
    }
    const csrfToken =
      typeof payload.csrfToken === "string" ? payload.csrfToken : null;
    if (requireCsrf && cookieToken) {
      const providedCsrf = request.headers.get("X-CSRF-Token");
      if (
        !csrfToken ||
        !providedCsrf ||
        !(await secretsMatch(providedCsrf, csrfToken))
      ) {
        throw new HttpError(403, "CSRF token is invalid", "csrf_invalid");
      }
    }
    return {
      login: env.OWNER_LOGIN,
      csrfToken,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Owner session is invalid", "unauthorized");
  }
}

function isAllowedReturnPath(pathname: string): boolean {
  return pathname === "/annotations/" || normalizeArticlePath(pathname) === pathname;
}

function oauthCallbackUrl(env: Env): string {
  return `${new URL(env.SITE_URL).origin}/auth/github/callback`;
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
      !isAllowedReturnPath(returnTo.pathname)
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
  authorize.searchParams.set("redirect_uri", oauthCallbackUrl(env));
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
      !isAllowedReturnPath(returnTo.pathname)
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
      redirect_uri: oauthCallbackUrl(env),
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

  const csrfToken = crypto.randomUUID();
  const token = await signSession(env, env.OWNER_LOGIN, csrfToken);
  const sameOriginSession = returnTo.origin === new URL(env.SITE_URL).origin;
  if (!sameOriginSession) {
    returnTo.hash = `rowan-comments-auth=${encodeURIComponent(token)}`;
  }
  const headers = new Headers({
    "Cache-Control": "no-store",
    Location: returnTo.toString(),
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  if (sameOriginSession) headers.set("Set-Cookie", sessionCookie(token));
  return new Response(null, {
    status: 302,
    headers,
  });
}

function commentsEtag(version: number): string {
  return `"comments-${version}"`;
}

function logD1Metric(details: Record<string, string | number | boolean>): void {
  console.log(JSON.stringify({ message: "comments_d1_metric", ...details }));
}

export function scheduleGitHubMirror(
  ctx: ExecutionContext,
  env: Env,
  resource: D1Resource,
  operation: () => Promise<void>
): void {
  ctx.waitUntil(
    operation().catch(async error => {
      await markResourceMirrorFailed(env.ANNOTATIONS_DB, resource).catch(markError => {
        console.error(
          JSON.stringify({
            message: "github_mirror_state_update_failed",
            operation: resource.kind,
            resourceId: resource.id,
            articlePath: resource.articlePath,
            error: markError instanceof Error ? markError.message : String(markError),
          })
        );
      });
      console.error(
        JSON.stringify({
          message: "github_mirror_failed",
          operation: resource.kind,
          resourceId: resource.id,
          articlePath: resource.articlePath,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    })
  );
}

async function ensureGitHubDiscussion(
  env: Env,
  path: string,
  title: string
): Promise<DiscussionSummary> {
  const article = await getD1Article(env.ANNOTATIONS_DB, path);
  if (article && !article.github_discussion_id.startsWith("pending:")) {
    return {
      id: article.github_discussion_id,
      number: article.github_discussion_number,
      title: article.title,
      url: article.github_url,
    };
  }
  const discussion = (await findDiscussion(env, path)) ?? (await createDiscussion(env, path, title));
  await markArticleMirrored(env.ANNOTATIONS_DB, path, discussion);
  return discussion;
}

async function mirrorCreatedResource(
  env: Env,
  resource: D1Resource,
  articleTitle: string
): Promise<void> {
  const discussion = await ensureGitHubDiscussion(env, resource.articlePath, articleTitle);
  let replyToId: string | undefined;
  if (resource.kind === "reply") {
    const parent = await getD1Resource(
      env.ANNOTATIONS_DB,
      resource.annotationId,
      env.OWNER_LOGIN
    );
    if (!parent?.githubNodeId) throw new Error("github_parent_not_mirrored");
    replyToId = parent.githubNodeId;
  }
  const comment = await addDiscussionComment(
    env,
    discussion.id,
    resource.body,
    replyToId
  );
  await markResourceMirrored(env.ANNOTATIONS_DB, resource, comment);
}

async function handleGetComments(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = normalizeArticlePath(url.searchParams.get("path") ?? "");
  if (!path) throw new HttpError(400, "Article path is invalid", "invalid_path");

  const startedAt = performance.now();
  const value = await getD1CommentList(env.ANNOTATIONS_DB, path);
  const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
  const etag = commentsEtag(value.version);
  logD1Metric({
    route: "/api/comments",
    operation: "read",
    status: 200,
    d1DurationMs: durationMs,
    threadCount: value.threads.length,
    articleVersion: value.version,
  });
  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ...Object.fromEntries(corsHeaders(request, env)), ETag: etag },
    });
  }
  const response = jsonResponse(request, env, value, {
    headers: { "Cache-Control": "no-cache", ETag: etag },
  });
  return response;
}

async function handleCreateComment(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  requireAllowedOrigin(request, env);
  await requireOwnerSession(request, env, true);
  const input = createCommentSchema.safeParse(await readJson(request));
  if (!input.success) {
    throw new HttpError(400, "Comment input is invalid", "invalid_comment");
  }

  const author = {
    login: env.OWNER_LOGIN,
    avatarUrl: `https://github.com/${env.OWNER_LOGIN}.png`,
    url: `https://github.com/${env.OWNER_LOGIN}`,
  };
  const startedAt = performance.now();
  let result;
  if (input.data.replyToId) {
    try {
      result = await createD1Reply(env.ANNOTATIONS_DB, {
        path: input.data.path,
        annotationId: input.data.replyToId,
        body: input.data.body,
        author,
        siteUrl: env.SITE_URL,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "annotation_not_found") {
        throw new HttpError(404, "Reply target was not found", "comment_not_found");
      }
      throw error;
    }
  } else {
    if (!input.data.anchor) {
      throw new HttpError(400, "Annotation anchor is required", "anchor_required");
    }
    const storedBody = buildAnnotationCommentBody(
      { version: 1, path: input.data.path, anchor: input.data.anchor },
      input.data.body
    );
    result = await createD1Annotation(env.ANNOTATIONS_DB, {
      path: input.data.path,
      articleTitle: input.data.articleTitle,
      body: storedBody,
      anchor: input.data.anchor,
      author,
      siteUrl: env.SITE_URL,
    });
  }
  const id = "thread" in result ? result.thread.id : result.reply.id;
  const resource = await getD1Resource(env.ANNOTATIONS_DB, id, env.OWNER_LOGIN);
  if (!resource) throw new Error("created_resource_not_found");
  scheduleGitHubMirror(ctx, env, resource, () =>
    mirrorCreatedResource(env, resource, input.data.articleTitle)
  );
  logD1Metric({
    route: "/api/owner/comments",
    operation: resource.kind === "annotation" ? "create_annotation" : "create_reply",
    status: 201,
    d1DurationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    articleVersion: result.version,
  });
  return jsonResponse(request, env, result, { status: 201 });
}

async function handleUpdateComment(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  id: string
): Promise<Response> {
  requireAllowedOrigin(request, env);
  await requireOwnerSession(request, env, true);
  const input = updateCommentSchema.safeParse(await readJson(request));
  if (!input.success) {
    throw new HttpError(400, "Comment input is invalid", "invalid_comment");
  }
  const resource = await getD1Resource(env.ANNOTATIONS_DB, id, env.OWNER_LOGIN);
  if (!resource) throw new HttpError(404, "Comment was not found", "comment_not_found");
  const metadata = annotationMetadata(resource);
  const body = metadata
    ? buildAnnotationCommentBody(metadata, input.data.body)
    : input.data.body;
  const startedAt = performance.now();
  const result = await updateD1Resource(
    env.ANNOTATIONS_DB,
    resource,
    body,
    env.OWNER_LOGIN
  );
  if (resource.githubNodeId) {
    scheduleGitHubMirror(ctx, env, resource, async () => {
      const comment = await updateDiscussionComment(env, resource.githubNodeId!, body);
      await markResourceMirrored(env.ANNOTATIONS_DB, resource, comment);
    });
  }
  logD1Metric({
    route: "/api/owner/comments/:id",
    operation: `update_${resource.kind}`,
    status: 200,
    d1DurationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    articleVersion: result.version,
  });
  return jsonResponse(request, env, { version: result.version });
}

async function handleDeleteComment(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  id: string
): Promise<Response> {
  requireAllowedOrigin(request, env);
  await requireOwnerSession(request, env, true);
  const resource = await getD1Resource(env.ANNOTATIONS_DB, id, env.OWNER_LOGIN);
  if (!resource) throw new HttpError(404, "Comment was not found", "comment_not_found");
  const startedAt = performance.now();
  const result = await deleteD1Resource(env.ANNOTATIONS_DB, resource);
  if (resource.githubNodeId) {
    scheduleGitHubMirror(ctx, env, resource, () =>
      deleteDiscussionComment(env, resource.githubNodeId!)
    );
  }
  logD1Metric({
    route: "/api/owner/comments/:id",
    operation: `delete_${resource.kind}`,
    status: 200,
    d1DurationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    articleVersion: result.version,
  });
  return jsonResponse(request, env, result);
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
    return handleGetComments(request, env);
  }
  if (request.method === "GET" && url.pathname === "/api/owner/session") {
    try {
      const session = await requireOwnerSession(request, env);
      return jsonResponse(
        request,
        env,
        {
          canWrite: true,
          login: session.login,
          csrfToken: session.csrfToken,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401) throw error;
      return jsonResponse(
        request,
        env,
        { canWrite: false },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
  }
  if (request.method === "POST" && url.pathname === "/api/owner/logout") {
    requireAllowedOrigin(request, env);
    await requireOwnerSession(request, env, true);
    return new Response(null, {
      status: 204,
      headers: {
        ...Object.fromEntries(corsHeaders(request, env)),
        "Cache-Control": "no-store",
        "Set-Cookie": clearedSessionCookie(),
      },
    });
  }
  if (request.method === "POST" && url.pathname === "/api/owner/comments") {
    return handleCreateComment(request, env, ctx);
  }
  const commentMatch = url.pathname.match(/^\/api\/owner\/comments\/([^/]+)$/);
  if (commentMatch && request.method === "PATCH") {
    return handleUpdateComment(
      request,
      env,
      ctx,
      decodeURIComponent(commentMatch[1])
    );
  }
  if (commentMatch && request.method === "DELETE") {
    return handleDeleteComment(
      request,
      env,
      ctx,
      decodeURIComponent(commentMatch[1])
    );
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
