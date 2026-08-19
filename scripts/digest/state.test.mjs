import { describe, expect, it } from "vitest";
import { parseDigestItems } from "./state.mjs";

describe("digest source state", () => {
  it("restores source items from an existing daily digest", () => {
    const raw = `---
title: "技术简报 2026-08-20"
sources:
  - title: "angular/angular 22.1.3"
    url: "https://github.com/angular/angular/releases/tag/v22.1.3"
    domain: "angular"
    label: "Angular releases"
    publishedAt: 2026-08-19T20:10:39Z
---

## Angular
`;

    expect(parseDigestItems(raw)).toEqual([
      expect.objectContaining({
        title: "angular/angular 22.1.3",
        url: "https://github.com/angular/angular/releases/tag/v22.1.3",
        domain: "angular",
        sourceLabel: "Angular releases",
        publishedAt: "2026-08-19T20:10:39Z",
      }),
    ]);
  });

  it("returns no preserved items for malformed frontmatter", () => {
    expect(parseDigestItems("# no frontmatter")).toEqual([]);
  });
});
