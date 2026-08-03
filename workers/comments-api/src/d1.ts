import type { AnnotationMetadata } from "../../../src/comments/protocol";

type GitHubAuthor = {
  login: string;
  avatarUrl: string;
  url: string;
} | null;

type GitHubCommentRecord = {
  id: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  author: GitHubAuthor;
};

type DiscussionRecord = {
  id: string;
  number: number;
  url: string;
};

type ArticleRecord = {
  path: string;
  title: string;
  discussion: DiscussionRecord;
};

type ShadowWriteContext = {
  operation: string;
  resourceId: string;
  articlePath: string;
};

type CreateAnnotationInput = {
  article: ArticleRecord;
  comment: GitHubCommentRecord;
  body: string;
  metadata: AnnotationMetadata;
};

type CreateReplyInput = {
  article: ArticleRecord;
  comment: GitHubCommentRecord;
  annotationId: string;
  body: string;
};

type UpdateAnnotationInput = CreateAnnotationInput;

type UpdateReplyInput = {
  article: ArticleRecord;
  comment: GitHubCommentRecord;
  body: string;
};

type DeleteResourceInput = {
  article: ArticleRecord;
  resourceId: string;
  deletedAt: string;
};

const ghostAuthor = {
  login: "ghost",
  avatarUrl: "https://github.com/ghost.png",
  url: "https://github.com/ghost",
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function scheduleShadowWrite(
  ctx: ExecutionContext,
  details: ShadowWriteContext,
  operation: () => Promise<void>
): void {
  ctx.waitUntil(
    operation().catch(error => {
      console.error(
        JSON.stringify({
          message: "d1_shadow_write_failed",
          ...details,
          error: errorMessage(error),
        })
      );
    })
  );
}

function upsertArticle(
  db: D1Database,
  article: ArticleRecord,
  timestamp: string
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO articles (
        path, title, github_discussion_id, github_discussion_number,
        github_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        github_discussion_id = excluded.github_discussion_id,
        github_discussion_number = excluded.github_discussion_number,
        github_url = excluded.github_url,
        updated_at = excluded.updated_at`
    )
    .bind(
      article.path,
      article.title,
      article.discussion.id,
      article.discussion.number,
      article.discussion.url,
      timestamp,
      timestamp
    );
}

function incrementVersion(
  db: D1Database,
  path: string,
  timestamp: string
): D1PreparedStatement {
  return db
    .prepare(
      "UPDATE articles SET version = version + 1, updated_at = ? WHERE path = ?"
    )
    .bind(timestamp, path);
}

function annotationUpsert(
  db: D1Database,
  input: CreateAnnotationInput
): D1PreparedStatement {
  const author = input.comment.author ?? ghostAuthor;
  return db
    .prepare(
      `INSERT INTO annotations (
        id, article_path, author_login, author_avatar_url, author_url, body,
        github_url, block_id, heading_id, exact_text, prefix_text, suffix_text,
        view, github_node_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        article_path = excluded.article_path,
        author_login = excluded.author_login,
        author_avatar_url = excluded.author_avatar_url,
        author_url = excluded.author_url,
        body = excluded.body,
        github_url = excluded.github_url,
        block_id = excluded.block_id,
        heading_id = excluded.heading_id,
        exact_text = excluded.exact_text,
        prefix_text = excluded.prefix_text,
        suffix_text = excluded.suffix_text,
        view = excluded.view,
        github_node_id = excluded.github_node_id,
        updated_at = excluded.updated_at`
    )
    .bind(
      input.comment.id,
      input.article.path,
      author.login,
      author.avatarUrl,
      author.url,
      input.body,
      input.comment.url,
      input.metadata.anchor.blockId,
      input.metadata.anchor.headingId,
      input.metadata.anchor.exact,
      input.metadata.anchor.prefix,
      input.metadata.anchor.suffix,
      input.metadata.anchor.view,
      input.comment.id,
      input.comment.createdAt,
      input.comment.updatedAt
    );
}

export async function shadowCreateAnnotation(
  db: D1Database,
  input: CreateAnnotationInput
): Promise<void> {
  await db.batch([
    upsertArticle(db, input.article, input.comment.updatedAt),
    annotationUpsert(db, input),
    incrementVersion(db, input.article.path, input.comment.updatedAt),
  ]);
}

export async function shadowCreateReply(
  db: D1Database,
  input: CreateReplyInput
): Promise<void> {
  const author = input.comment.author ?? ghostAuthor;
  await db.batch([
    upsertArticle(db, input.article, input.comment.updatedAt),
    db
      .prepare(
        `INSERT INTO replies (
          id, annotation_id, author_login, author_avatar_url, author_url, body,
          github_url, kind, github_node_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'human', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          annotation_id = excluded.annotation_id,
          author_login = excluded.author_login,
          author_avatar_url = excluded.author_avatar_url,
          author_url = excluded.author_url,
          body = excluded.body,
          github_url = excluded.github_url,
          kind = excluded.kind,
          github_node_id = excluded.github_node_id,
          updated_at = excluded.updated_at`
      )
      .bind(
        input.comment.id,
        input.annotationId,
        author.login,
        author.avatarUrl,
        author.url,
        input.body,
        input.comment.url,
        input.comment.id,
        input.comment.createdAt,
        input.comment.updatedAt
      ),
    incrementVersion(db, input.article.path, input.comment.updatedAt),
  ]);
}

export async function shadowUpdateAnnotation(
  db: D1Database,
  input: UpdateAnnotationInput
): Promise<void> {
  await shadowCreateAnnotation(db, input);
}

export async function shadowUpdateReply(
  db: D1Database,
  input: UpdateReplyInput
): Promise<void> {
  await upsertArticle(db, input.article, input.comment.updatedAt).run();
  const result = await db
    .prepare(
      `UPDATE replies SET
        body = ?, github_url = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`
    )
    .bind(
      input.body,
      input.comment.url,
      input.comment.updatedAt,
      input.comment.id
    )
    .run();
  if (result.meta.changes !== 1) {
    throw new Error(`D1 reply ${input.comment.id} was not found for update`);
  }
  await incrementVersion(
    db,
    input.article.path,
    input.comment.updatedAt
  ).run();
}

export async function shadowDeleteAnnotation(
  db: D1Database,
  input: DeleteResourceInput
): Promise<void> {
  const results = await db.batch([
    upsertArticle(db, input.article, input.deletedAt),
    db
      .prepare(
        `UPDATE annotations SET
          status = 'deleted', deleted_at = ?, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`
      )
      .bind(input.deletedAt, input.deletedAt, input.resourceId),
    db
      .prepare(
        `UPDATE replies SET deleted_at = ?, updated_at = ?
        WHERE annotation_id = ? AND deleted_at IS NULL`
      )
      .bind(input.deletedAt, input.deletedAt, input.resourceId),
    incrementVersion(db, input.article.path, input.deletedAt),
  ]);
  if (results[1].meta.changes !== 1) {
    throw new Error(`D1 annotation ${input.resourceId} was not found for delete`);
  }
}

export async function shadowDeleteReply(
  db: D1Database,
  input: DeleteResourceInput
): Promise<void> {
  await upsertArticle(db, input.article, input.deletedAt).run();
  const result = await db
    .prepare(
      `UPDATE replies SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`
    )
    .bind(input.deletedAt, input.deletedAt, input.resourceId)
    .run();
  if (result.meta.changes !== 1) {
    throw new Error(`D1 reply ${input.resourceId} was not found for delete`);
  }
  await incrementVersion(db, input.article.path, input.deletedAt).run();
}
