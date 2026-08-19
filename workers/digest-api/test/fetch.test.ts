import { describe, expect, it } from "vitest";
import { filterAndCap, mergePreservedItems, parseRssText } from "../src/fetch";
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

describe("digest worker RSS parsing", () => {
  it("parses Simon Willison-style feeds with more than 1000 entities", () => {
    const entities = "&nbsp;".repeat(1_200);
    const feed = `<rss version="2.0"><channel><item><title>Entity-heavy post</title><link>https://example.com/entity-heavy</link><description>${entities}</description></item></channel></rss>`;

    expect(parseRssText(feed).rss.channel.item.title).toBe("Entity-heavy post");
    expect(parseRssText(feed).rss.channel.item.link).toBe("https://example.com/entity-heavy");
  });
});

describe("digest force regeneration", () => {
  it("keeps sources missing from the current feed and appends new sources", () => {
    const angular = item({
      id: "angular-old",
      url: "https://example.com/angular-old",
      domain: "angular",
    });
    const fresh = item({ id: "ai-new", url: "https://example.com/ai-new" });

    expect(mergePreservedItems([angular], [fresh])).toEqual([angular, fresh]);
  });

  it("prefers the preserved record when a source appears again", () => {
    const preserved = item({ title: "Published title" });
    const fetched = item({ title: "Changed feed title" });

    expect(mergePreservedItems([preserved], [fetched])).toEqual([preserved]);
  });
});
