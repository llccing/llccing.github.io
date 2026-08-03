import { describe, expect, it } from "vitest";
import {
  createD1Annotation,
  createD1Reply,
  deleteD1Resource,
  getD1CommentList,
  updateD1Resource,
  type D1Resource,
} from "../src/d1";

type CapturedStatement = { sql: string; params: unknown[] };

function createDatabase(options: {
  first?: (sql: string, params: unknown[]) => unknown;
  all?: (sql: string, params: unknown[]) => unknown[];
  changes?: number;
} = {}) {
  const statements: CapturedStatement[] = [];
  const batches: CapturedStatement[][] = [];
  const prepare = (sql: string) => ({
    bind(...params: unknown[]) {
      const captured = { sql, params };
      statements.push(captured);
      return {
        sql,
        params,
        first: async () => options.first?.(sql, params) ?? null,
        all: async () => ({ results: options.all?.(sql, params) ?? [] }),
        run: async () => ({ meta: { changes: options.changes ?? 1 } }),
      };
    },
  });
  const db = {
    prepare,
    async batch(items: Array<{ sql?: string; params?: unknown[] }>) {
      batches.push(items.map(item => ({ sql: item.sql ?? "", params: item.params ?? [] })));
      return items.map(() => ({ meta: { changes: options.changes ?? 1 } }));
    },
  } as unknown as D1Database;
  return { db, statements, batches };
}

const path = "/posts/example/";
const anchor = {
  blockId: "cb-article-example",
  headingId: "example",
  exact: "selected text",
  prefix: "before",
  suffix: "after",
  view: "article" as const,
};
const author = {
  login: "llccing",
  avatarUrl: "https://github.com/llccing.png",
  url: "https://github.com/llccing",
};
const annotation: D1Resource = {
  kind: "annotation",
  id: "annotation-1",
  articlePath: path,
  annotationId: "annotation-1",
  body: "before",
  githubNodeId: "DC_1",
  githubMirrorState: "synced",
  anchor,
};

describe("D1 primary annotation storage", () => {
  it("maps public rows and excludes deleted content in SQL", async () => {
    const { db, statements } = createDatabase({
      first: sql =>
        sql.includes("FROM articles")
          ? {
              path,
              title: "Example",
              github_discussion_id: "D_1",
              github_discussion_number: 1,
              github_url: "https://github.com/discussions/1",
              version: 7,
            }
          : null,
      all: sql =>
        sql.includes("FROM annotations")
          ? [
              {
                id: "annotation-1",
                article_path: path,
                author_login: author.login,
                author_avatar_url: author.avatarUrl,
                author_url: author.url,
                body: "body",
                github_url: "https://github.com/comment/1",
                block_id: anchor.blockId,
                heading_id: anchor.headingId,
                exact_text: anchor.exact,
                prefix_text: anchor.prefix,
                suffix_text: anchor.suffix,
                view: anchor.view,
                github_node_id: "DC_1",
                github_mirror_state: "synced",
                created_at: "2026-08-04T00:00:00Z",
                updated_at: "2026-08-04T00:00:00Z",
              },
            ]
          : [],
    });
    const result = await getD1CommentList(db, path);
    expect(result.version).toBe(7);
    expect(result.threads.map(thread => thread.id)).toEqual(["annotation-1"]);
    expect(
      statements.filter(item => item.sql.includes("FROM annotations"))[0].sql
    ).toContain("deleted_at IS NULL");
    expect(
      statements.filter(item => item.sql.includes("FROM annotations"))[0].sql
    ).toContain("status = 'open'");
  });

  it("creates annotations and replies with pending GitHub mirrors and increments version", async () => {
    const { db, statements, batches } = createDatabase({
      first: sql => {
        if (sql.includes("SELECT version")) return { version: 2 };
        if (sql.includes("SELECT id FROM annotations")) return { id: "annotation-1" };
        return null;
      },
    });
    await createD1Annotation(db, {
      path,
      articleTitle: "Example",
      body: "annotation body",
      anchor,
      author,
      siteUrl: "https://rowanliu.com",
    });
    await createD1Reply(db, {
      path,
      annotationId: "annotation-1",
      body: "reply body",
      author,
      siteUrl: "https://rowanliu.com",
    });
    expect(batches).toHaveLength(2);
    expect(statements.some(item => item.sql.includes("INSERT INTO annotations"))).toBe(true);
    expect(statements.some(item => item.sql.includes("INSERT INTO replies"))).toBe(true);
    expect(statements.filter(item => item.sql.includes("INSERT INTO annotations"))[0].sql).toContain(
      "'pending'"
    );
  });

  it("records a revision before an edit and increments the article version", async () => {
    const { db, statements, batches } = createDatabase({
      first: sql => (sql.includes("SELECT version") ? { version: 8 } : null),
    });
    const result = await updateD1Resource(db, annotation, "after", author.login);
    expect(result.version).toBe(8);
    expect(batches[0][0].sql).toContain("INSERT INTO annotation_revisions");
    expect(batches[0][0].params).toContain("before");
    expect(statements.some(item => item.sql.includes("version = version + 1"))).toBe(true);
  });

  it("soft-deletes annotations and their replies", async () => {
    const { db, statements } = createDatabase({
      first: sql => (sql.includes("SELECT version") ? { version: 9 } : null),
    });
    await deleteD1Resource(db, annotation);
    expect(statements.some(item => item.sql.includes("status = 'deleted'"))).toBe(true);
    expect(statements.some(item => item.sql.includes("WHERE annotation_id = ?"))).toBe(true);
  });
});
