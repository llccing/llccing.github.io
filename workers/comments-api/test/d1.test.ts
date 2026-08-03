import { describe, expect, it, vi } from "vitest";
import type { AnnotationMetadata } from "../../../src/comments/protocol";
import {
  scheduleShadowWrite,
  shadowCreateAnnotation,
  shadowCreateReply,
  shadowDeleteAnnotation,
  shadowDeleteReply,
  shadowUpdateAnnotation,
  shadowUpdateReply,
} from "../src/d1";

type CapturedStatement = {
  sql: string;
  params: unknown[];
};

function createDatabase(changes = 1): {
  db: D1Database;
  statements: CapturedStatement[];
  batches: CapturedStatement[][];
} {
  const statements: CapturedStatement[] = [];
  const batches: CapturedStatement[][] = [];
  const db = {
    prepare(sql: string) {
      const statement: CapturedStatement = { sql, params: [] };
      return {
        bind(...params: unknown[]) {
          statement.params = params;
          statements.push(statement);
          return {
            ...this,
            run: vi.fn().mockResolvedValue({ meta: { changes } }),
          };
        },
      };
    },
    batch(batch: Array<{ sql?: string; params?: unknown[] }>) {
      batches.push(
        batch.map(statement => ({
          sql: statement.sql ?? "",
          params: statement.params ?? [],
        }))
      );
      return Promise.resolve(batch.map(() => ({ meta: { changes } })));
    },
  };
  return { db: db as never, statements, batches };
}

const metadata: AnnotationMetadata = {
  version: 1,
  path: "/posts/example/",
  anchor: {
    blockId: "cb-article-example",
    headingId: "example",
    exact: "selected text",
    prefix: "before",
    suffix: "after",
    view: "article",
  },
};

const article = {
  path: metadata.path,
  title: "Example",
  discussion: {
    id: "D_1",
    number: 1,
    url: "https://github.com/discussions/1",
  },
};

const comment = {
  id: "DC_1",
  body: "GitHub body",
  url: "https://github.com/discussions/1#discussioncomment-1",
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:01.000Z",
  author: {
    login: "llccing",
    avatarUrl: "https://github.com/avatar.png",
    url: "https://github.com/llccing",
  },
};

describe("D1 annotation shadow writes", () => {
  it("maps annotation and reply creates into parameterized batches", async () => {
    const { db, statements, batches } = createDatabase();

    await shadowCreateAnnotation(db, {
      article,
      comment,
      body: "annotation body",
      metadata,
    });
    await shadowCreateReply(db, {
      article,
      comment: { ...comment, id: "DC_REPLY" },
      annotationId: comment.id,
      body: "reply body",
    });

    expect(batches).toHaveLength(2);
    expect(statements.some(item => item.sql.includes("INSERT INTO annotations"))).toBe(
      true
    );
    expect(statements.some(item => item.sql.includes("INSERT INTO replies"))).toBe(
      true
    );
    expect(
      statements.find(item => item.sql.includes("INSERT INTO annotations"))?.params
    ).toContain("annotation body");
    expect(
      statements.find(item => item.sql.includes("INSERT INTO replies"))?.params
    ).toContain(comment.id);
    expect(statements.every(item => !item.sql.includes("annotation body"))).toBe(true);
  });

  it("maps annotation and reply updates to their respective tables", async () => {
    const { db, statements } = createDatabase();

    await shadowUpdateAnnotation(db, {
      article,
      comment,
      body: "updated annotation",
      metadata,
    });
    await shadowUpdateReply(db, {
      article,
      comment: { ...comment, id: "DC_REPLY" },
      body: "updated reply",
    });

    expect(statements.some(item => item.sql.includes("INSERT INTO annotations"))).toBe(
      true
    );
    expect(statements.some(item => item.sql.includes("UPDATE replies SET"))).toBe(
      true
    );
  });

  it("soft-deletes annotations with replies and deletes individual replies", async () => {
    const { db, statements } = createDatabase();
    const deletedAt = "2026-08-04T00:01:00.000Z";

    await shadowDeleteAnnotation(db, {
      article,
      resourceId: comment.id,
      deletedAt,
    });
    await shadowDeleteReply(db, {
      article,
      resourceId: "DC_REPLY",
      deletedAt,
    });

    expect(
      statements.some(item =>
        item.sql.includes("status = 'deleted', deleted_at = ?")
      )
    ).toBe(true);
    expect(
      statements.some(item => item.sql.includes("WHERE annotation_id = ?"))
    ).toBe(true);
    expect(
      statements.some(item => item.sql.includes("WHERE id = ? AND deleted_at IS NULL"))
    ).toBe(true);
  });

  it("reports a missing reply instead of silently accepting shadow drift", async () => {
    const { db } = createDatabase(0);
    await expect(
      shadowUpdateReply(db, {
        article,
        comment: { ...comment, id: "missing" },
        body: "updated reply",
      })
    ).rejects.toThrow("was not found for update");
  });

  it("contains D1 failures inside waitUntil and logs structured context", async () => {
    const waitUntil = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    scheduleShadowWrite(
      { waitUntil } as never,
      {
        operation: "create_annotation",
        resourceId: comment.id,
        articlePath: article.path,
      },
      () => Promise.reject(new Error("D1 unavailable"))
    );

    expect(waitUntil).toHaveBeenCalledOnce();
    await expect(waitUntil.mock.calls[0][0]).resolves.toBeUndefined();
    expect(JSON.parse(error.mock.calls[0][0] as string)).toMatchObject({
      message: "d1_shadow_write_failed",
      operation: "create_annotation",
      resourceId: comment.id,
      articlePath: article.path,
      error: "D1 unavailable",
    });
  });
});
