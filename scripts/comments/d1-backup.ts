import { readFile } from "node:fs/promises";
import { z } from "zod";

const authorSchema = z.object({
  login: z.string().min(1),
  avatarUrl: z.string(),
  url: z.string(),
});

const anchorSchema = z.object({
  blockId: z.string().min(1),
  headingId: z.string().nullable(),
  exact: z.string().min(1),
  prefix: z.string(),
  suffix: z.string(),
  view: z.enum(["article", "translated", "original"]),
});

const replySchema = z.object({
  id: z.string().min(1),
  body: z.string(),
  url: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  author: authorSchema.nullable(),
});

const annotationSchema = z.object({
  id: z.string().min(1),
  body: z.string(),
  url: z.string(),
  author: authorSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  metadata: z.object({
    version: z.literal(1),
    path: z
      .string()
      .regex(/^\/(posts|short-stories)\/[a-z0-9][a-z0-9-]*\/$/),
    anchor: anchorSchema,
  }),
  replies: z.array(replySchema),
});

const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime(),
  repository: z.literal("llccing/llccing.github.io"),
  categoryId: z.string().min(1),
  counts: z.object({
    discussionsScanned: z.number().int().nonnegative(),
    discussionsExported: z.number().int().nonnegative(),
    annotations: z.number().int().nonnegative(),
    replies: z.number().int().nonnegative(),
  }),
  discussions: z.array(
    z.object({
      discussion: z.object({
        id: z.string().min(1),
        number: z.number().int().positive(),
        title: z.string().min(1),
        url: z.string(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
      }),
      annotations: z.array(annotationSchema),
    })
  ),
});

export type AnnotationBackup = z.infer<typeof backupSchema>;

export type D1ArticleRecord = {
  path: string;
  title: string;
  githubDiscussionId: string;
  githubDiscussionNumber: number;
  githubUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type D1AnnotationRecord = {
  id: string;
  articlePath: string;
  authorLogin: string;
  authorAvatarUrl: string;
  authorUrl: string;
  body: string;
  githubUrl: string;
  blockId: string;
  headingId: string | null;
  exactText: string;
  prefixText: string;
  suffixText: string;
  view: "article" | "translated" | "original";
  githubNodeId: string;
  createdAt: string;
  updatedAt: string;
};

export type D1ReplyRecord = {
  id: string;
  annotationId: string;
  authorLogin: string;
  authorAvatarUrl: string;
  authorUrl: string;
  body: string;
  githubUrl: string;
  kind: "human" | "ai";
  githubNodeId: string;
  createdAt: string;
  updatedAt: string;
};

export type D1BackupRecords = {
  articles: D1ArticleRecord[];
  annotations: D1AnnotationRecord[];
  replies: D1ReplyRecord[];
};

const ghostAuthor = {
  login: "ghost",
  avatarUrl: "https://github.com/ghost.png",
  url: "https://github.com/ghost",
};

export async function loadAnnotationBackup(
  inputPath: string
): Promise<AnnotationBackup> {
  const value: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  const backup = backupSchema.parse(value);
  const records = backupRecords(backup);
  if (
    backup.counts.discussionsExported !== backup.discussions.length ||
    backup.counts.annotations !== records.annotations.length ||
    backup.counts.replies !== records.replies.length
  ) {
    throw new Error("Backup count fields do not match the exported records");
  }
  const ids = [
    ...records.annotations.map(record => record.id),
    ...records.replies.map(record => record.id),
  ];
  if (new Set(ids).size !== ids.length) {
    throw new Error("Backup contains duplicate annotation or reply IDs");
  }
  return backup;
}

export function backupRecords(backup: AnnotationBackup): D1BackupRecords {
  const articles: D1ArticleRecord[] = [];
  const annotations: D1AnnotationRecord[] = [];
  const replies: D1ReplyRecord[] = [];

  for (const entry of backup.discussions) {
    const paths = new Set(
      entry.annotations.map(annotation => annotation.metadata.path)
    );
    if (paths.size !== 1) {
      throw new Error(
        `Discussion ${entry.discussion.id} contains multiple article paths`
      );
    }
    const path = [...paths][0];
    articles.push({
      path,
      title: entry.discussion.title,
      githubDiscussionId: entry.discussion.id,
      githubDiscussionNumber: entry.discussion.number,
      githubUrl: entry.discussion.url,
      createdAt: entry.discussion.createdAt,
      updatedAt: entry.discussion.updatedAt,
    });

    for (const annotation of entry.annotations) {
      const author = annotation.author ?? ghostAuthor;
      annotations.push({
        id: annotation.id,
        articlePath: annotation.metadata.path,
        authorLogin: author.login,
        authorAvatarUrl: author.avatarUrl,
        authorUrl: author.url,
        body: annotation.body,
        githubUrl: annotation.url,
        blockId: annotation.metadata.anchor.blockId,
        headingId: annotation.metadata.anchor.headingId,
        exactText: annotation.metadata.anchor.exact,
        prefixText: annotation.metadata.anchor.prefix,
        suffixText: annotation.metadata.anchor.suffix,
        view: annotation.metadata.anchor.view,
        githubNodeId: annotation.id,
        createdAt: annotation.createdAt,
        updatedAt: annotation.updatedAt,
      });

      for (const reply of annotation.replies) {
        const replyAuthor = reply.author ?? ghostAuthor;
        replies.push({
          id: reply.id,
          annotationId: annotation.id,
          authorLogin: replyAuthor.login,
          authorAvatarUrl: replyAuthor.avatarUrl,
          authorUrl: replyAuthor.url,
          body: reply.body,
          githubUrl: reply.url,
          kind: reply.body.includes("<!-- rowan-ai-reply:v1") ? "ai" : "human",
          githubNodeId: reply.id,
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
        });
      }
    }
  }

  return { articles, annotations, replies };
}

export function sqlValue(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("Unsafe SQL integer");
    return String(value);
  }
  return `'${value.replaceAll("'", "''")}'`;
}

export function generateImportSql(records: D1BackupRecords): string {
  const statements = ["PRAGMA foreign_keys = ON;"];
  for (const article of records.articles) {
    statements.push(`INSERT INTO articles (
  path, title, github_discussion_id, github_discussion_number, github_url,
  created_at, updated_at
) VALUES (
  ${sqlValue(article.path)}, ${sqlValue(article.title)},
  ${sqlValue(article.githubDiscussionId)}, ${sqlValue(article.githubDiscussionNumber)},
  ${sqlValue(article.githubUrl)}, ${sqlValue(article.createdAt)},
  ${sqlValue(article.updatedAt)}
) ON CONFLICT(path) DO UPDATE SET
  title = excluded.title,
  github_discussion_id = excluded.github_discussion_id,
  github_discussion_number = excluded.github_discussion_number,
  github_url = excluded.github_url,
  updated_at = excluded.updated_at;`);
  }
  for (const annotation of records.annotations) {
    statements.push(`INSERT INTO annotations (
  id, article_path, author_login, author_avatar_url, author_url, body,
  github_url, block_id, heading_id, exact_text, prefix_text, suffix_text,
  view, github_node_id, created_at, updated_at
) VALUES (
  ${sqlValue(annotation.id)}, ${sqlValue(annotation.articlePath)},
  ${sqlValue(annotation.authorLogin)}, ${sqlValue(annotation.authorAvatarUrl)},
  ${sqlValue(annotation.authorUrl)}, ${sqlValue(annotation.body)},
  ${sqlValue(annotation.githubUrl)}, ${sqlValue(annotation.blockId)},
  ${sqlValue(annotation.headingId)}, ${sqlValue(annotation.exactText)},
  ${sqlValue(annotation.prefixText)}, ${sqlValue(annotation.suffixText)},
  ${sqlValue(annotation.view)}, ${sqlValue(annotation.githubNodeId)},
  ${sqlValue(annotation.createdAt)}, ${sqlValue(annotation.updatedAt)}
) ON CONFLICT(id) DO UPDATE SET
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
  updated_at = excluded.updated_at;`);
  }
  for (const reply of records.replies) {
    statements.push(`INSERT INTO replies (
  id, annotation_id, author_login, author_avatar_url, author_url, body,
  github_url, kind, github_node_id, created_at, updated_at
) VALUES (
  ${sqlValue(reply.id)}, ${sqlValue(reply.annotationId)},
  ${sqlValue(reply.authorLogin)}, ${sqlValue(reply.authorAvatarUrl)},
  ${sqlValue(reply.authorUrl)}, ${sqlValue(reply.body)},
  ${sqlValue(reply.githubUrl)}, ${sqlValue(reply.kind)},
  ${sqlValue(reply.githubNodeId)}, ${sqlValue(reply.createdAt)},
  ${sqlValue(reply.updatedAt)}
) ON CONFLICT(id) DO UPDATE SET
  annotation_id = excluded.annotation_id,
  author_login = excluded.author_login,
  author_avatar_url = excluded.author_avatar_url,
  author_url = excluded.author_url,
  body = excluded.body,
  github_url = excluded.github_url,
  kind = excluded.kind,
  github_node_id = excluded.github_node_id,
  updated_at = excluded.updated_at;`);
  }
  return `${statements.join("\n\n")}\n`;
}

export function compareRecordSets(
  expected: Array<Record<string, unknown>>,
  actual: Array<Record<string, unknown>>,
  idKey: string
): Array<{ id: unknown; issue: string; field?: string }> {
  const mismatches: Array<{ id: unknown; issue: string; field?: string }> = [];
  const expectedById = new Map(expected.map(record => [record[idKey], record]));
  const actualById = new Map(actual.map(record => [record[idKey], record]));
  for (const [id, expectedRecord] of expectedById) {
    const actualRecord = actualById.get(id);
    if (!actualRecord) {
      mismatches.push({ id, issue: "missing" });
      continue;
    }
    for (const [field, value] of Object.entries(expectedRecord)) {
      if (actualRecord[field] !== value) {
        mismatches.push({ id, issue: "field_mismatch", field });
      }
    }
  }
  for (const id of actualById.keys()) {
    if (!expectedById.has(id)) mismatches.push({ id, issue: "unexpected" });
  }
  return mismatches;
}
