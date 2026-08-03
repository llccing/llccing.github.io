import { describe, expect, it } from "vitest";
import type { AnnotationThread } from "./protocol";
import {
  removeOptimisticResource,
  replaceOptimisticReply,
  replaceOptimisticThread,
  updateOptimisticBody,
} from "./optimistic";

const thread: AnnotationThread = {
  id: "thread-1",
  url: "",
  bodyHtml: "",
  bodyText: "before",
  createdAt: "2026-08-04T00:00:00Z",
  updatedAt: "2026-08-04T00:00:00Z",
  author: { login: "llccing", avatarUrl: "", url: "" },
  anchor: {
    blockId: "block",
    headingId: null,
    exact: "text",
    prefix: "",
    suffix: "",
    view: "article",
  },
  replies: [
    {
      id: "reply-1",
      bodyHtml: "",
      bodyText: "reply before",
      createdAt: "2026-08-04T00:00:00Z",
      updatedAt: "2026-08-04T00:00:00Z",
      author: { login: "llccing", avatarUrl: "", url: "" },
    },
  ],
};

describe("optimistic comment state", () => {
  it("replaces temporary annotations and replies with saved resources", () => {
    expect(
      replaceOptimisticThread([{ ...thread, id: "temp" }], "temp", thread)[0].id
    ).toBe("thread-1");
    const reply = {
      ...thread.replies[0],
      id: "saved",
      annotationId: thread.id,
    };
    expect(
      replaceOptimisticReply(
        [{ ...thread, replies: [{ ...thread.replies[0], id: "temp" }] }],
        "temp",
        reply
      )[0].replies[0].id
    ).toBe("saved");
  });

  it("updates either resource kind and removes a thread or individual reply", () => {
    expect(updateOptimisticBody([thread], thread.id, "after")[0].bodyText).toBe(
      "after"
    );
    expect(
      updateOptimisticBody([thread], "reply-1", "reply after")[0].replies[0]
        .bodyText
    ).toBe("reply after");
    expect(removeOptimisticResource([thread], "reply-1")[0].replies).toEqual(
      []
    );
    expect(removeOptimisticResource([thread], thread.id)).toEqual([]);
  });
});
