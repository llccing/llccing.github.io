import type { Element, Root } from "hast";
import { describe, expect, it } from "vitest";
import { rehypeCommentAnchors } from "./rehype-comment-anchors";

function paragraph(value: string): Element {
  return {
    type: "element",
    tagName: "p",
    properties: {},
    children: [{ type: "text", value }],
  };
}

function transform(tree: Root): Root {
  const plugin = rehypeCommentAnchors();
  plugin(tree);
  return tree;
}

describe("rehypeCommentAnchors", () => {
  it("produces stable IDs when unrelated earlier content changes", () => {
    const first = paragraph("需要批注的段落");
    const second = paragraph("需要批注的段落");
    transform({ type: "root", children: [paragraph("旧前言"), first] });
    transform({ type: "root", children: [paragraph("新前言"), second] });

    expect(first.properties["data-comment-block-id"]).toBe(
      second.properties["data-comment-block-id"]
    );
  });

  it("scopes anchors to the nearest heading and disambiguates duplicates", () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h2",
          properties: { id: "signals" },
          children: [{ type: "text", value: "Signals" }],
        },
        paragraph("相同内容"),
        paragraph("相同内容"),
      ],
    };

    transform(tree);
    const first = tree.children[1] as Element;
    const second = tree.children[2] as Element;
    expect(first.properties["data-comment-heading-id"]).toBe("signals");
    expect(String(second.properties["data-comment-block-id"])).toBe(
      `${String(first.properties["data-comment-block-id"])}-2`
    );
  });
});
