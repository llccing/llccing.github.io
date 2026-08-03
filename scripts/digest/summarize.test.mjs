import { describe, expect, it } from "vitest";
import {
  describeResponseShape,
  extractResponseText,
} from "./summarize.mjs";

describe("digest model response extraction", () => {
  it("extracts a standard Chat Completions message", () => {
    const response = {
      choices: [{ message: { content: "## AI\n标准响应" }, finish_reason: "stop" }],
    };

    expect(extractResponseText(response)).toBe("## AI\n标准响应");
  });

  it("joins multipart Chat Completions text", () => {
    const response = {
      choices: [
        {
          message: {
            content: [
              { type: "text", text: "第一段" },
              { type: "image_url", image_url: { url: "https://example.com" } },
              { type: "text", text: "第二段" },
            ],
          },
        },
      ],
    };

    expect(extractResponseText(response)).toBe("第一段\n第二段");
  });

  it("extracts the Responses API output_text shortcut", () => {
    expect(extractResponseText({ output_text: "## 全栈\nResponses 响应" })).toBe(
      "## 全栈\nResponses 响应"
    );
  });

  it("extracts nested Responses API output content", () => {
    const response = {
      object: "response",
      output: [
        { type: "reasoning", content: [] },
        {
          type: "message",
          content: [{ type: "output_text", text: "## AI\n嵌套响应" }],
        },
      ],
    };

    expect(extractResponseText(response)).toBe("## AI\n嵌套响应");
  });

  it("rejects unknown success envelopes and describes only their shape", () => {
    const response = { id: "secret-id", object: "job", status: "queued" };

    expect(extractResponseText(response)).toBe("");
    expect(describeResponseShape(response)).toBe(
      "object=job keys=[id,object,status] choices=absent output=absent"
    );
    expect(describeResponseShape(response)).not.toContain("secret-id");
  });
});
