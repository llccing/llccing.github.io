import { describe, expect, it } from "vitest";
import { compareRecordSets, generateImportSql, sqlValue } from "./d1-backup";
import { parseWranglerRows } from "./d1-cli";

describe("D1 annotation backup helpers", () => {
  it("escapes SQL strings without changing nulls or integers", () => {
    expect(sqlValue("Rowan's\nannotation")).toBe("'Rowan''s\nannotation'");
    expect(sqlValue(null)).toBe("NULL");
    expect(sqlValue(42)).toBe("42");
  });

  it("generates idempotent upserts that do not clear soft deletion", () => {
    const sql = generateImportSql({
      articles: [
        {
          path: "/posts/example/",
          title: "Example",
          githubDiscussionId: "D_1",
          githubDiscussionNumber: 1,
          githubUrl: "https://github.com/discussions/1",
          createdAt: "2026-08-01T00:00:00Z",
          updatedAt: "2026-08-01T00:00:00Z",
        },
      ],
      annotations: [],
      replies: [],
    });
    expect(sql).toContain("ON CONFLICT(path) DO UPDATE SET");
    expect(sql).not.toContain("deleted_at = NULL");
  });

  it("reports missing, changed, and unexpected records", () => {
    expect(
      compareRecordSets(
        [
          { id: "one", body: "same" },
          { id: "two", body: "expected" },
          { id: "missing", body: "value" },
        ],
        [
          { id: "one", body: "same" },
          { id: "two", body: "actual" },
          { id: "extra", body: "value" },
        ],
        "id"
      )
    ).toEqual([
      { id: "two", issue: "field_mismatch", field: "body" },
      { id: "missing", issue: "missing" },
      { id: "extra", issue: "unexpected" },
    ]);
  });

  it("parses Wrangler JSON result rows", () => {
    expect(
      parseWranglerRows(
        JSON.stringify([
          { results: [{ id: "one" }, { id: "two" }], success: true },
        ])
      )
    ).toEqual([{ id: "one" }, { id: "two" }]);
  });
});
