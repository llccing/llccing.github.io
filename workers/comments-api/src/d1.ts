import {
  parseAnnotationMetadata,
  type AnnotationAnchor,
  type AnnotationAiJob,
  type AnnotationThread,
  type CommentAuthor,
  type CommentListResponse,
  type CommentReply,
} from "../../../src/comments/protocol";

export type D1Resource = {
  kind: "annotation" | "reply";
  id: string;
  articlePath: string;
  annotationId: string;
  body: string;
  githubNodeId: string | null;
  githubMirrorState: "pending" | "synced" | "failed";
  anchor: AnnotationAnchor | null;
};

type AuthorInput = CommentAuthor;

type CreateAnnotationInput = {
  path: string;
  articleTitle: string;
  body: string;
  anchor: AnnotationAnchor;
  author: AuthorInput;
  siteUrl: string;
  aiJobId?: string;
};

type CreateReplyInput = {
  path: string;
  annotationId: string;
  body: string;
  author: AuthorInput;
  siteUrl: string;
};

type ArticleRow = {
  path: string;
  title: string;
  github_discussion_id: string;
  github_discussion_number: number;
  github_url: string;
  version: number;
};

type AnnotationRow = {
  id: string;
  article_path: string;
  author_login: string;
  author_avatar_url: string;
  author_url: string;
  body: string;
  github_url: string;
  block_id: string;
  heading_id: string | null;
  exact_text: string;
  prefix_text: string;
  suffix_text: string;
  view: AnnotationAnchor["view"];
  github_node_id: string;
  github_mirror_state: D1Resource["githubMirrorState"];
  created_at: string;
  updated_at: string;
};

type ReplyRow = {
  id: string;
  annotation_id: string;
  article_path: string;
  author_login: string;
  author_avatar_url: string;
  author_url: string;
  body: string;
  github_url: string;
  github_node_id: string;
  github_mirror_state: D1Resource["githubMirrorState"];
  created_at: string;
  updated_at: string;
};

type AiJobRow = {
  id: string;
  annotation_id: string;
  status: AnnotationAiJob["status"];
  attempt_count: number;
  provider: string | null;
  model: string | null;
  error_code: string | null;
  reply_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

export type AiJobMessage = {
  jobId: string;
  annotationId: string;
  articlePath: string;
};

export type ClaimedAiJob = AiJobMessage & {
  body: string;
  articleTitle: string;
  anchor: AnnotationAnchor;
  attemptCount: number;
};

const annotationColumns = `
  id, article_path, author_login, author_avatar_url, author_url, body,
  github_url, block_id, heading_id, exact_text, prefix_text, suffix_text,
  view, github_node_id, github_mirror_state, created_at, updated_at`;

const replyColumns = `
  replies.id, replies.annotation_id, annotations.article_path,
  replies.author_login, replies.author_avatar_url, replies.author_url,
  replies.body, replies.github_url, replies.github_node_id,
  replies.github_mirror_state, replies.created_at, replies.updated_at`;

function pendingValue(id: string): string {
  return `pending:${id}`;
}

function authorFromRow(row: {
  author_login: string;
  author_avatar_url: string;
  author_url: string;
}): CommentAuthor {
  return {
    login: row.author_login,
    avatarUrl: row.author_avatar_url,
    url: row.author_url,
  };
}

function replyFromRow(row: ReplyRow): CommentReply {
  return {
    id: row.id,
    bodyHtml: "",
    bodyText: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: authorFromRow(row),
  };
}

function aiJobFromRow(row: AiJobRow): AnnotationAiJob {
  return {
    id: row.id,
    status: row.status,
    attemptCount: row.attempt_count,
    provider: row.provider,
    model: row.model,
    errorCode: row.error_code,
    replyId: row.reply_id,
    updatedAt: row.updated_at ?? row.completed_at ?? row.started_at ?? row.created_at,
  };
}

function annotationFromRow(row: AnnotationRow, replies: CommentReply[]): AnnotationThread {
  return {
    id: row.id,
    url: row.github_mirror_state === "synced" ? row.github_url : "",
    bodyHtml: "",
    bodyText: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: authorFromRow(row),
    anchor: {
      blockId: row.block_id,
      headingId: row.heading_id,
      exact: row.exact_text,
      prefix: row.prefix_text,
      suffix: row.suffix_text,
      view: row.view,
    },
    replies,
  };
}

async function articleVersion(db: D1Database, path: string): Promise<number> {
  const row = await db
    .prepare("SELECT version FROM articles WHERE path = ?")
    .bind(path)
    .first<{ version: number }>();
  return row?.version ?? 0;
}

function incrementVersion(db: D1Database, path: string, timestamp: string): D1PreparedStatement {
  return db
    .prepare("UPDATE articles SET version = version + 1, updated_at = ? WHERE path = ?")
    .bind(timestamp, path);
}

function insertArticle(
  db: D1Database,
  path: string,
  title: string,
  siteUrl: string,
  timestamp: string
): D1PreparedStatement {
  const placeholder = pendingValue(`discussion:${path}`);
  return db
    .prepare(
      `INSERT INTO articles (
        path, title, github_discussion_id, github_discussion_number, github_url,
        version, created_at, updated_at, github_mirror_state
      ) VALUES (?, ?, ?, 0, ?, 0, ?, ?, 'pending')
      ON CONFLICT(path) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at`
    )
    .bind(path, title, placeholder, `${siteUrl}${path}`, timestamp, timestamp);
}

export async function getD1CommentList(
  db: D1Database,
  path: string
): Promise<CommentListResponse> {
  const article = await db
    .prepare(
      `SELECT path, title, github_discussion_id, github_discussion_number,
        github_url, version FROM articles WHERE path = ?`
    )
    .bind(path)
    .first<ArticleRow>();
  if (!article) {
    return { version: 0, discussion: null, threads: [], truncated: false };
  }

  const [annotationResult, replyResult, aiJobResult] = await Promise.all([
    db
      .prepare(
        `SELECT ${annotationColumns} FROM annotations
        WHERE article_path = ? AND status = 'open' AND deleted_at IS NULL
        ORDER BY created_at, id`
      )
      .bind(path)
      .all<AnnotationRow>(),
    db
      .prepare(
        `SELECT ${replyColumns} FROM replies
        JOIN annotations ON annotations.id = replies.annotation_id
        WHERE annotations.article_path = ? AND annotations.status = 'open'
          AND annotations.deleted_at IS NULL AND replies.deleted_at IS NULL
        ORDER BY replies.created_at, replies.id`
      )
      .bind(path)
      .all<ReplyRow>(),
    db
      .prepare(
        `SELECT ai_jobs.* FROM ai_jobs
        JOIN annotations ON annotations.id = ai_jobs.annotation_id
        WHERE annotations.article_path = ? AND annotations.status = 'open'
          AND annotations.deleted_at IS NULL`
      )
      .bind(path)
      .all<AiJobRow>(),
  ]);
  const replies = new Map<string, CommentReply[]>();
  for (const row of replyResult.results) {
    replies.set(row.annotation_id, [
      ...(replies.get(row.annotation_id) ?? []),
      replyFromRow(row),
    ]);
  }
  const discussionIsMirrored = !article.github_discussion_id.startsWith("pending:");
  const aiJobs = new Map(
    aiJobResult.results.map(row => [row.annotation_id, aiJobFromRow(row)])
  );
  return {
    version: article.version,
    discussion: discussionIsMirrored
      ? {
          id: article.github_discussion_id,
          number: article.github_discussion_number,
          title: article.title,
          url: article.github_url,
        }
      : null,
    threads: annotationResult.results.map(row => ({
      ...annotationFromRow(row, replies.get(row.id) ?? []),
      ...(aiJobs.has(row.id) ? { aiJob: aiJobs.get(row.id) } : {}),
    })),
    truncated: false,
  };
}

export async function createD1Annotation(
  db: D1Database,
  input: CreateAnnotationInput
): Promise<{ thread: AnnotationThread; version: number }> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const placeholder = pendingValue(id);
  const statements = [
    insertArticle(db, input.path, input.articleTitle, input.siteUrl, timestamp),
    db
      .prepare(
        `INSERT INTO annotations (
          id, article_path, author_login, author_avatar_url, author_url, body,
          github_url, block_id, heading_id, exact_text, prefix_text, suffix_text,
          view, status, github_node_id, created_at, updated_at, github_mirror_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, 'pending')`
      )
      .bind(
        id,
        input.path,
        input.author.login,
        input.author.avatarUrl,
        input.author.url,
        input.body,
        `${input.siteUrl}${input.path}#annotation-${id}`,
        input.anchor.blockId,
        input.anchor.headingId,
        input.anchor.exact,
        input.anchor.prefix,
        input.anchor.suffix,
        input.anchor.view,
        placeholder,
        timestamp,
        timestamp
      ),
    ...(input.aiJobId
      ? [
          db
            .prepare(
              `INSERT INTO ai_jobs (
                id, annotation_id, status, attempt_count, created_at, updated_at
              ) VALUES (?, ?, 'queued', 0, ?, ?)`
            )
            .bind(input.aiJobId, id, timestamp, timestamp),
        ]
      : []),
    incrementVersion(db, input.path, timestamp),
  ];
  await db.batch(statements);
  const aiJob = input.aiJobId
    ? {
        id: input.aiJobId,
        status: "queued" as const,
        attemptCount: 0,
        provider: null,
        model: null,
        errorCode: null,
        replyId: null,
        updatedAt: timestamp,
      }
    : undefined;
  return {
    version: await articleVersion(db, input.path),
    thread: {
      id,
      url: "",
      bodyHtml: "",
      bodyText: input.body,
      createdAt: timestamp,
      updatedAt: timestamp,
      author: input.author,
      anchor: input.anchor,
      replies: [],
      ...(aiJob ? { aiJob } : {}),
    },
  };
}

export async function createD1Reply(
  db: D1Database,
  input: CreateReplyInput
): Promise<{ reply: CommentReply & { annotationId: string }; version: number }> {
  const parent = await db
    .prepare(
      `SELECT id FROM annotations WHERE id = ? AND article_path = ?
      AND status = 'open' AND deleted_at IS NULL`
    )
    .bind(input.annotationId, input.path)
    .first<{ id: string }>();
  if (!parent) throw new Error("annotation_not_found");
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT INTO replies (
          id, annotation_id, author_login, author_avatar_url, author_url, body,
          github_url, kind, github_node_id, created_at, updated_at, github_mirror_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'human', ?, ?, ?, 'pending')`
      )
      .bind(
        id,
        input.annotationId,
        input.author.login,
        input.author.avatarUrl,
        input.author.url,
        input.body,
        `${input.siteUrl}${input.path}#reply-${id}`,
        pendingValue(id),
        timestamp,
        timestamp
      ),
    incrementVersion(db, input.path, timestamp),
  ]);
  return {
    version: await articleVersion(db, input.path),
    reply: {
      id,
      annotationId: input.annotationId,
      bodyHtml: "",
      bodyText: input.body,
      createdAt: timestamp,
      updatedAt: timestamp,
      author: input.author,
    },
  };
}

export async function createD1AiJob(
  db: D1Database,
  message: Omit<AiJobMessage, "jobId">
): Promise<AnnotationAiJob & { annotationId: string }> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO ai_jobs (
        id, annotation_id, status, attempt_count, created_at, updated_at
      ) VALUES (?, ?, 'queued', 0, ?, ?)
      ON CONFLICT(annotation_id) DO NOTHING`
    )
    .bind(id, message.annotationId, timestamp, timestamp)
    .run();
  const row = await db
    .prepare("SELECT * FROM ai_jobs WHERE annotation_id = ?")
    .bind(message.annotationId)
    .first<AiJobRow>();
  if (!row) throw new Error("ai_job_not_created");
  return { ...aiJobFromRow(row), annotationId: row.annotation_id };
}

export async function getD1AiJob(
  db: D1Database,
  annotationId: string
): Promise<(AnnotationAiJob & { annotationId: string; articlePath: string }) | null> {
  const row = await db
    .prepare(
      `SELECT ai_jobs.*, annotations.article_path FROM ai_jobs
      JOIN annotations ON annotations.id = ai_jobs.annotation_id
      WHERE ai_jobs.annotation_id = ? AND annotations.status = 'open'
        AND annotations.deleted_at IS NULL`
    )
    .bind(annotationId)
    .first<AiJobRow & { article_path: string }>();
  return row
    ? { ...aiJobFromRow(row), annotationId: row.annotation_id, articlePath: row.article_path }
    : null;
}

export async function retryD1AiJob(
  db: D1Database,
  annotationId: string
): Promise<(AnnotationAiJob & { annotationId: string; articlePath: string; version: number }) | null> {
  const job = await getD1AiJob(db, annotationId);
  if (!job || job.status === "completed") return job ? { ...job, version: await articleVersion(db, job.articlePath) } : null;
  const timestamp = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `UPDATE ai_jobs SET status = 'queued', error_code = NULL, updated_at = ?
        WHERE annotation_id = ? AND status = 'failed'`
      )
      .bind(timestamp, annotationId),
    incrementVersion(db, job.articlePath, timestamp),
  ]);
  const updated = await getD1AiJob(db, annotationId);
  return updated
    ? { ...updated, version: await articleVersion(db, updated.articlePath) }
    : null;
}

export async function markD1AiJobFailed(
  db: D1Database,
  jobId: string,
  articlePath: string,
  errorCode: string
): Promise<number> {
  const timestamp = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `UPDATE ai_jobs SET status = 'failed', error_code = ?, updated_at = ?
        WHERE id = ? AND status != 'completed'`
      )
      .bind(errorCode, timestamp, jobId),
    incrementVersion(db, articlePath, timestamp),
  ]);
  return articleVersion(db, articlePath);
}

export async function claimD1AiJob(
  db: D1Database,
  message: AiJobMessage,
  provider: string,
  model: string
): Promise<ClaimedAiJob | "completed" | null> {
  const row = await db
    .prepare(
      `SELECT ai_jobs.*, annotations.body, annotations.block_id,
        annotations.heading_id, annotations.exact_text, annotations.prefix_text,
        annotations.suffix_text, annotations.view, annotations.article_path,
        articles.title AS article_title
      FROM ai_jobs
      JOIN annotations ON annotations.id = ai_jobs.annotation_id
      JOIN articles ON articles.path = annotations.article_path
      WHERE ai_jobs.id = ? AND ai_jobs.annotation_id = ?
        AND annotations.article_path = ? AND annotations.status = 'open'
        AND annotations.deleted_at IS NULL`
    )
    .bind(message.jobId, message.annotationId, message.articlePath)
    .first<AiJobRow & {
      body: string;
      block_id: string;
      heading_id: string | null;
      exact_text: string;
      prefix_text: string;
      suffix_text: string;
      view: AnnotationAnchor["view"];
      article_path: string;
      article_title: string;
    }>();
  if (!row) return null;
  if (row.status === "completed") return "completed";
  const timestamp = new Date().toISOString();
  const result = await db.batch([
    db
      .prepare(
        `UPDATE ai_jobs SET status = 'answering', attempt_count = attempt_count + 1,
          provider = ?, model = ?, error_code = NULL, started_at = ?, updated_at = ?
        WHERE id = ? AND status != 'completed'`
      )
      .bind(provider, model, timestamp, timestamp, message.jobId),
    incrementVersion(db, message.articlePath, timestamp),
  ]);
  if (result[0].meta.changes !== 1) return "completed";
  return {
    ...message,
    body: row.body,
    articleTitle: row.article_title,
    anchor: {
      blockId: row.block_id,
      headingId: row.heading_id,
      exact: row.exact_text,
      prefix: row.prefix_text,
      suffix: row.suffix_text,
      view: row.view,
    },
    attemptCount: row.attempt_count + 1,
  };
}

export async function completeD1AiJob(
  db: D1Database,
  job: ClaimedAiJob,
  answer: string,
  author: AuthorInput,
  siteUrl: string
): Promise<{ resource: D1Resource; version: number }> {
  const id = `ai:${job.jobId}`;
  const timestamp = new Date().toISOString();
  const body = `<!-- rowan-ai-reply:v1 ${job.annotationId} -->\n\n${answer}`;
  await db.batch([
    db
      .prepare(
        `INSERT INTO replies (
          id, annotation_id, author_login, author_avatar_url, author_url, body,
          github_url, kind, github_node_id, created_at, updated_at,
          github_mirror_state, ai_job_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ai', ?, ?, ?, 'pending', ?)
        ON CONFLICT DO NOTHING`
      )
      .bind(
        id,
        job.annotationId,
        author.login,
        author.avatarUrl,
        author.url,
        body,
        `${siteUrl}${job.articlePath}#reply-${encodeURIComponent(id)}`,
        pendingValue(id),
        timestamp,
        timestamp,
        job.jobId
      ),
    db
      .prepare(
        `UPDATE ai_jobs SET status = 'completed', reply_id = ?, error_code = NULL,
          completed_at = ?, updated_at = ? WHERE id = ?`
      )
      .bind(id, timestamp, timestamp, job.jobId),
    incrementVersion(db, job.articlePath, timestamp),
  ]);
  return {
    version: await articleVersion(db, job.articlePath),
    resource: {
      kind: "reply",
      id,
      articlePath: job.articlePath,
      annotationId: job.annotationId,
      body,
      githubNodeId: null,
      githubMirrorState: "pending",
      anchor: null,
    },
  };
}

export async function getD1Resource(
  db: D1Database,
  id: string,
  ownerLogin: string
): Promise<D1Resource | null> {
  const annotation = await db
    .prepare(
      `SELECT ${annotationColumns} FROM annotations
      WHERE id = ? AND author_login = ? AND status = 'open' AND deleted_at IS NULL`
    )
    .bind(id, ownerLogin)
    .first<AnnotationRow>();
  if (annotation) {
    return {
      kind: "annotation",
      id,
      articlePath: annotation.article_path,
      annotationId: id,
      body: annotation.body,
      githubNodeId: annotation.github_node_id.startsWith("pending:")
        ? null
        : annotation.github_node_id,
      githubMirrorState: annotation.github_mirror_state,
      anchor: {
        blockId: annotation.block_id,
        headingId: annotation.heading_id,
        exact: annotation.exact_text,
        prefix: annotation.prefix_text,
        suffix: annotation.suffix_text,
        view: annotation.view,
      },
    };
  }
  const reply = await db
    .prepare(
      `SELECT ${replyColumns} FROM replies
      JOIN annotations ON annotations.id = replies.annotation_id
      WHERE replies.id = ? AND replies.author_login = ?
        AND replies.deleted_at IS NULL AND annotations.deleted_at IS NULL`
    )
    .bind(id, ownerLogin)
    .first<ReplyRow>();
  return reply
    ? {
        kind: "reply",
        id,
        articlePath: reply.article_path,
        annotationId: reply.annotation_id,
        body: reply.body,
        githubNodeId: reply.github_node_id.startsWith("pending:")
          ? null
          : reply.github_node_id,
        githubMirrorState: reply.github_mirror_state,
        anchor: null,
      }
    : null;
}

export async function updateD1Resource(
  db: D1Database,
  resource: D1Resource,
  body: string,
  changedBy: string
): Promise<{ version: number; updatedAt: string }> {
  const timestamp = new Date().toISOString();
  const table = resource.kind === "annotation" ? "annotations" : "replies";
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO annotation_revisions
          (resource_type, resource_id, previous_body, changed_at, changed_by)
        VALUES (?, ?, ?, ?, ?)`
      )
      .bind(resource.kind, resource.id, resource.body, timestamp, changedBy),
    db
      .prepare(`UPDATE ${table} SET body = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .bind(body, timestamp, resource.id),
    incrementVersion(db, resource.articlePath, timestamp),
  ]);
  if (results[1].meta.changes !== 1) throw new Error("resource_not_found");
  return { version: await articleVersion(db, resource.articlePath), updatedAt: timestamp };
}

export async function deleteD1Resource(
  db: D1Database,
  resource: D1Resource
): Promise<{ version: number }> {
  const timestamp = new Date().toISOString();
  const statements = resource.kind === "annotation"
    ? [
        db
          .prepare(
            `UPDATE annotations SET status = 'deleted', deleted_at = ?, updated_at = ?
            WHERE id = ? AND deleted_at IS NULL`
          )
          .bind(timestamp, timestamp, resource.id),
        db
          .prepare(
            `UPDATE replies SET deleted_at = ?, updated_at = ?
            WHERE annotation_id = ? AND deleted_at IS NULL`
          )
          .bind(timestamp, timestamp, resource.id),
      ]
    : [
        db
          .prepare(
            `UPDATE replies SET deleted_at = ?, updated_at = ?
            WHERE id = ? AND deleted_at IS NULL`
          )
          .bind(timestamp, timestamp, resource.id),
      ];
  const results = await db.batch([
    ...statements,
    incrementVersion(db, resource.articlePath, timestamp),
  ]);
  if (results[0].meta.changes !== 1) throw new Error("resource_not_found");
  return { version: await articleVersion(db, resource.articlePath) };
}

export async function getD1Article(db: D1Database, path: string): Promise<ArticleRow | null> {
  return db
    .prepare(
      `SELECT path, title, github_discussion_id, github_discussion_number,
        github_url, version FROM articles WHERE path = ?`
    )
    .bind(path)
    .first<ArticleRow>();
}

export async function markArticleMirrored(
  db: D1Database,
  path: string,
  discussion: { id: string; number: number; url: string }
): Promise<void> {
  await db
    .prepare(
      `UPDATE articles SET github_discussion_id = ?, github_discussion_number = ?,
        github_url = ?, github_mirror_state = 'synced' WHERE path = ?`
    )
    .bind(discussion.id, discussion.number, discussion.url, path)
    .run();
}

export async function markResourceMirrored(
  db: D1Database,
  resource: D1Resource,
  github: { id: string; url: string }
): Promise<void> {
  const table = resource.kind === "annotation" ? "annotations" : "replies";
  await db
    .prepare(
      `UPDATE ${table} SET github_node_id = ?, github_url = ?, github_mirror_state = 'synced'
      WHERE id = ?`
    )
    .bind(github.id, github.url, resource.id)
    .run();
}

export async function markResourceMirrorFailed(
  db: D1Database,
  resource: D1Resource
): Promise<void> {
  const table = resource.kind === "annotation" ? "annotations" : "replies";
  await db
    .prepare(`UPDATE ${table} SET github_mirror_state = 'failed' WHERE id = ?`)
    .bind(resource.id)
    .run();
}

export function annotationMetadata(resource: D1Resource) {
  if (resource.kind !== "annotation" || !resource.anchor) return null;
  return parseAnnotationMetadata(resource.body) ?? {
    version: 1 as const,
    path: resource.articlePath,
    anchor: resource.anchor,
  };
}
