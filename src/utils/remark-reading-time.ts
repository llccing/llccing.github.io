import type { Root } from "mdast";

function extractText(node: any): string {
  if (node.type === "text") return node.value;
  if (node.children) {
    return node.children.map(extractText).join("");
  }
  return "";
}

export function remarkReadingTime() {
  return (tree: Root, { data }: { data: Record<string, any> }) => {
    const text = extractText(tree);
    const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || [])
      .length;
    const nonCjkWords = text
      .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, "")
      .split(/\s+/)
      .filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(cjkChars / 300 + nonCjkWords / 200));
    data.astro ??= {};
    data.astro.frontmatter ??= {};
    data.astro.frontmatter.minutesRead = `${minutes} min read`;
  };
}
