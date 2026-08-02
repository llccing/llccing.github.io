import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const API_URL = "https://api.github.com/graphql";
const ANNOTATION_MARKER = /<!--\s*rowan-annotation:v1\s+([A-Za-z0-9_-]+)\s*-->/;

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function parseMetadata(body) {
  const match = body.match(ANNOTATION_MARKER);
  if (!match) return null;

  try {
    return JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

async function graphql(token, query, variables) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "rowan-blog-annotation-export",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map(error => error.message).join("; ");
    throw new Error(message || `GitHub GraphQL returned ${response.status}`);
  }
  return payload.data;
}

async function listDiscussions(token, owner, repo, categoryId) {
  const discussions = [];
  let after = null;
  do {
    const data = await graphql(
      token,
      `query Discussions($owner: String!, $repo: String!, $categoryId: ID!, $after: String) {
        repository(owner: $owner, name: $repo) {
          discussions(first: 100, after: $after, categoryId: $categoryId, orderBy: {field: CREATED_AT, direction: ASC}) {
            nodes { id number title url createdAt updatedAt }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
      { owner, repo, categoryId, after }
    );
    const connection = data.repository?.discussions;
    if (!connection) throw new Error("Repository discussions are unavailable");
    discussions.push(...connection.nodes);
    after = connection.pageInfo.hasNextPage
      ? connection.pageInfo.endCursor
      : null;
  } while (after);
  return discussions;
}

async function listComments(token, discussionId) {
  const comments = [];
  let after = null;
  do {
    const data = await graphql(
      token,
      `query DiscussionComments($id: ID!, $after: String) {
        node(id: $id) {
          ... on Discussion {
            comments(first: 100, after: $after) {
              nodes {
                id body url createdAt updatedAt
                author { login avatarUrl url }
                replies(first: 100) {
                  nodes { id body url createdAt updatedAt author { login avatarUrl url } }
                  pageInfo { hasNextPage endCursor }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      }`,
      { id: discussionId, after }
    );
    const connection = data.node?.comments;
    if (!connection) throw new Error(`Discussion ${discussionId} is unavailable`);
    comments.push(...connection.nodes);
    after = connection.pageInfo.hasNextPage
      ? connection.pageInfo.endCursor
      : null;
  } while (after);
  return comments;
}

async function listRemainingReplies(token, commentId, after) {
  const replies = [];
  while (after) {
    const data = await graphql(
      token,
      `query CommentReplies($id: ID!, $after: String) {
        node(id: $id) {
          ... on DiscussionComment {
            replies(first: 100, after: $after) {
              nodes { id body url createdAt updatedAt author { login avatarUrl url } }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      }`,
      { id: commentId, after }
    );
    const connection = data.node?.replies;
    if (!connection) throw new Error(`Comment ${commentId} is unavailable`);
    replies.push(...connection.nodes);
    after = connection.pageInfo.hasNextPage
      ? connection.pageInfo.endCursor
      : null;
  }
  return replies;
}

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error("Set GITHUB_TOKEN or GH_TOKEN before exporting");

  const owner = readArgument("--owner", "llccing");
  const repo = readArgument("--repo", "llccing.github.io");
  const categoryId = readArgument(
    "--category-id",
    "DIC_kwDOL98uEc4C7B0s"
  );
  const output = resolve(
    readArgument(
      "--output",
      `artifacts/cloudflare-migration/annotations-${new Date().toISOString().slice(0, 10)}.json`
    )
  );

  const discussions = await listDiscussions(token, owner, repo, categoryId);
  const exported = [];
  let replyCount = 0;

  for (const discussion of discussions) {
    const comments = await listComments(token, discussion.id);
    const annotations = [];
    for (const comment of comments) {
      const metadata = parseMetadata(comment.body);
      if (!metadata) continue;
      const replies = [...comment.replies.nodes];
      if (comment.replies.pageInfo.hasNextPage) {
        replies.push(
          ...(await listRemainingReplies(
            token,
            comment.id,
            comment.replies.pageInfo.endCursor
          ))
        );
      }
      replyCount += replies.length;
      annotations.push({
        id: comment.id,
        body: comment.body,
        url: comment.url,
        author: comment.author,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        metadata,
        replies,
      });
    }
    if (annotations.length) exported.push({ discussion, annotations });
  }

  const annotationCount = exported.reduce(
    (total, entry) => total + entry.annotations.length,
    0
  );
  const backup = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    repository: `${owner}/${repo}`,
    categoryId,
    counts: {
      discussionsScanned: discussions.length,
      discussionsExported: exported.length,
      annotations: annotationCount,
      replies: replyCount,
    },
    discussions: exported,
  };

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(backup, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(
    JSON.stringify({ output, ...backup.counts }, null, 2)
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
