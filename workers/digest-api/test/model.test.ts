import { afterEach, describe, expect, it, vi } from "vitest";
import { ModelError, summarize } from "../src/model";
import type { DigestItem } from "../src/types";

const item: DigestItem = {
  id: "item-1",
  url: "https://example.com/item-1",
  rawName: "item",
  title: "Item",
  publishedAt: new Date().toISOString(),
  summary: "A real item",
  sourceId: "source",
  sourceLabel: "Source",
  domain: "ai",
};

afterEach(() => vi.restoreAllMocks());

describe("digest worker model calls", () => {
  it("normalizes a bare provider URL and extracts Markdown", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "## AI\nA summary [1]" } }],
    }), { status: 200 }));

    await expect(summarize([item], "2026-08-19", "secret", "https://provider.example", "model")).resolves.toContain("## AI");
    expect(fetchMock.mock.calls[0][0]).toBe("https://provider.example/v1/chat/completions");
  });

  it("rejects an empty or invalid model response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 }));

    await expect(summarize([item], "2026-08-19", "secret", "https://provider.example/v1", "model")).rejects.toBeInstanceOf(ModelError);
  });

  it("preserves upstream status for retry classification", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 502 }));

    await expect(summarize([item], "2026-08-19", "secret", "https://provider.example/v1", "model")).rejects.toMatchObject({ status: 502 });
  });
});
