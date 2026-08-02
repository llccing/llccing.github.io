import { describe, expect, it } from "vitest";
import {
  buildAnnotationCommentBody,
  extractAnnotationText,
  extractSameSiteArticlePaths,
  normalizeArticlePath,
  parseAnnotationMetadata,
  stripAnnotationMarker,
  type AnnotationMetadata,
} from "./protocol";

const metadata: AnnotationMetadata = {
  version: 1,
  path: "/posts/signals-unified-reactivity-model/",
  anchor: {
    blockId: "cb-linked-signal-123",
    headingId: "linked-signal",
    exact: "linkedSignal 和 source 之间是单向绑定的关系。",
    prefix: "针对你的三个疑问，",
    suffix: "向上无关。",
    view: "article",
  },
};

describe("annotation protocol", () => {
  it("round-trips UTF-8 anchor metadata through the hidden marker", () => {
    const body = buildAnnotationCommentBody(metadata, "@ai 为什么是单向绑定？");

    expect(parseAnnotationMetadata(body)).toEqual(metadata);
    expect(stripAnnotationMarker(body)).toContain("@ai 为什么是单向绑定？");
    expect(extractAnnotationText(body)).toBe("@ai 为什么是单向绑定？");
    expect(body).not.toContain('"exact"');
  });

  it("accepts only canonical article paths", () => {
    expect(
      normalizeArticlePath("https://rowanliu.com/posts/example#part")
    ).toBe("/posts/example/");
    expect(normalizeArticlePath("/short-stories/example/")).toBe(
      "/short-stories/example/"
    );
    expect(normalizeArticlePath("/admin/example/")).toBeNull();
    expect(normalizeArticlePath("/posts/../../admin")).toBeNull();
  });

  it("extracts and deduplicates at most three same-site article links", () => {
    const paths = extractSameSiteArticlePaths(
      "比较 /posts/one/、https://rowanliu.com/posts/two 和 /posts/one/，" +
        "再看 /short-stories/three/ 与 /posts/four/。"
    );

    expect(paths).toEqual([
      "/posts/one/",
      "/posts/two/",
      "/short-stories/three/",
    ]);
  });
});
