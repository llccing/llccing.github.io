import { describe, expect, it } from "vitest";
import { filterAndCap } from "../src/fetch";
import type { DigestItem } from "../src/types";

function item(overrides: Partial<DigestItem> = {}): DigestItem {
  return {
    id: "item-1",
    url: "https://example.com/item-1",
    rawName: "item",
    title: "Item",
    publishedAt: new Date().toISOString(),
    summary: "summary",
    sourceId: "source",
    sourceLabel: "Source",
    domain: "ai",
    maxPerRun: 3,
    lookbackDays: 7,
    ...overrides,
  };
}

describe("digest worker filtering", () => {
  it("drops seen and duplicate URLs before applying caps", () => {
    const first = item();
    const second = item({ id: "item-2", url: "https://example.com/item-2" });

    expect(filterAndCap([first, first, second], [first.url])).toEqual([second]);
  });

  it("keeps only recent items", () => {
    const old = item({ publishedAt: new Date(Date.now() - 8 * 86400000).toISOString() });

    expect(filterAndCap([old], [])).toEqual([]);
  });

  it("enforces the per-source cap", () => {
    const items = Array.from({ length: 4 }, (_, index) => item({
      id: `item-${index}`,
      url: `https://example.com/item-${index}`,
      publishedAt: new Date(Date.now() - index * 1000).toISOString(),
    }));

    expect(filterAndCap(items, [])).toHaveLength(3);
  });
});
