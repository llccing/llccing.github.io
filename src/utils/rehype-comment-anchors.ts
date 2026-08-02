import { createHash } from "node:crypto";
import type { Element, Root } from "hast";
import { toText } from "hast-util-to-text";
import { visit } from "unist-util-visit";

const COMMENTABLE_TAGS = new Set([
  "p",
  "h2",
  "h3",
  "h4",
  "li",
  "blockquote",
  "pre",
  "figure",
]);

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function rehypeCommentAnchors() {
  return (tree: Root) => {
    let headingId = "article";
    const occurrences = new Map<string, number>();

    visit(tree, "element", (node: Element) => {
      if (/^h[2-4]$/.test(node.tagName)) {
        const existingId = node.properties?.id;
        const text = normalizeText(toText(node));
        headingId =
          typeof existingId === "string" && existingId
            ? existingId
            : slugPart(text) || "section";
      }

      if (!COMMENTABLE_TAGS.has(node.tagName)) return;
      const text = normalizeText(toText(node));
      if (!text) return;

      const digest = createHash("sha256")
        .update(`${node.tagName}:${text}`)
        .digest("hex")
        .slice(0, 12);
      const baseId = `cb-${slugPart(headingId) || "article"}-${digest}`;
      const occurrence = (occurrences.get(baseId) ?? 0) + 1;
      occurrences.set(baseId, occurrence);

      node.properties ??= {};
      node.properties["data-comment-block-id"] =
        occurrence === 1 ? baseId : `${baseId}-${occurrence}`;
      node.properties["data-comment-heading-id"] = headingId;
    });
  };
}
