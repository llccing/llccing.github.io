/**
 * Turn fetched source items into digest prose via an OpenAI-compatible model.
 *
 * The model is never asked to produce a URL. It cites items by index and the
 * caller renders the real links from the fetched data, so a citation can only
 * point at something that was actually retrieved.
 *
 * Unlike the old post generator this throws on failure instead of degrading to
 * a template. A red CI job is more useful than a committed placeholder.
 */

import { DOMAIN_LABELS } from "./sources.mjs";

const MAX_COMPLETION_TOKENS = 8000;

function textFromContentParts(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map(part => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      if (part.type && !["text", "output_text"].includes(part.type)) return "";
      return typeof part.text === "string" ? part.text : "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Accept the two text response contracts used by OpenAI-compatible gateways:
 * Chat Completions (`choices`) and Responses (`output_text` / `output`).
 */
export function extractResponseText(response) {
  if (!response || typeof response !== "object") return "";

  const chatChoice = response.choices?.[0];
  const chatText =
    textFromContentParts(chatChoice?.message?.content) ||
    (typeof chatChoice?.text === "string" ? chatChoice.text : "");
  if (chatText.trim()) return chatText;

  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  if (Array.isArray(response.output)) {
    const outputText = response.output
      .map(item => textFromContentParts(item?.content))
      .filter(Boolean)
      .join("\n");
    if (outputText.trim()) return outputText;
  }

  return textFromContentParts(response.content);
}

export function describeResponseShape(response) {
  if (response === null) return "null";
  if (typeof response !== "object") return typeof response;

  const keys = Object.keys(response).sort().slice(0, 20).join(",") || "none";
  const objectType =
    typeof response.object === "string" ? response.object : "unknown";
  const choices = Array.isArray(response.choices)
    ? response.choices.length
    : "absent";
  const output = Array.isArray(response.output) ? response.output.length : "absent";

  return `object=${objectType} keys=[${keys}] choices=${choices} output=${output}`;
}

/**
 * Some OpenAI-compatible proxies are configured as a bare host. The SDK appends
 * "/chat/completions" straight onto baseURL, which 404s without the /v1 prefix.
 */
export function normalizeBaseURL(raw) {
  try {
    const url = new URL(raw);
    if (url.pathname === "/" || url.pathname === "") url.pathname = "/v1";
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw;
  }
}

function logApiError(err, label) {
  console.error(`AI request failed (${label}): ${err?.message}`);
  if (err?.status) console.error(`  status: ${err.status}`);
  const code = err?.code ?? err?.error?.code;
  if (code) console.error(`  code: ${code}`);
  if (err?.error) {
    try {
      console.error(`  body: ${JSON.stringify(err.error).slice(0, 500)}`);
    } catch {
      // non-serializable payload; the message above is enough
    }
  }
}

function buildPrompt(itemsByDomain, dateStr) {
  const lines = [];
  let index = 0;
  const indexed = [];

  for (const [domain, items] of itemsByDomain) {
    lines.push(`\n## ${DOMAIN_LABELS[domain] ?? domain} (${domain})`);
    for (const item of items) {
      index += 1;
      indexed.push(item);
      lines.push(`[${index}] ${item.sourceLabel} — ${item.title}`);
      if (item.summary) lines.push(`    ${item.summary.slice(0, 600)}`);
    }
  }

  const prompt = `以下是 ${dateStr} 抓取到的技术动态原始条目，按领域分组：
${lines.join("\n")}

请写一份中文简报，要求：

1. 按领域分节，标题用二级标题（##），格式为「领域中文名」。
2. 每个领域下，把该领域的条目归纳成 2-5 句话，说明发生了什么、为什么值得关注。
3. 引用条目时用方括号编号，例如 [1]、[3]。编号必须对应上面的条目。
4. 不要输出任何 URL、链接或 Markdown 链接语法，编号引用由程序替换成真实链接。
5. 不要编造上面没有的版本号、日期、人名或功能。信息不足就少写。
6. 不要写开场白、结语、"总结"小节，也不要重复日期。
7. 只输出正文 Markdown，不要 frontmatter。`;

  return { prompt, indexed };
}

/** Render the citation list from real fetched data, never from model output. */
export function renderSources(indexed) {
  const lines = ["\n## 引用\n"];
  indexed.forEach((item, i) => {
    const date = item.publishedAt
      ? ` · ${new Date(item.publishedAt).toISOString().slice(0, 10)}`
      : "";
    lines.push(`${i + 1}. [${item.title}](${item.url}) — ${item.sourceLabel}${date}`);
  });
  return lines.join("\n") + "\n";
}

export async function summarize(itemsByDomain, dateStr) {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error("AI_API_KEY is not set");

  const baseURL = normalizeBaseURL(
    process.env.AI_BASE_URL || "https://api.openai.com/v1"
  );
  const model = process.env.AI_MODEL || "gpt-4o";

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey, baseURL });
  const { prompt, indexed } = buildPrompt(itemsByDomain, dateStr);

  console.log(`Summarizing ${indexed.length} items via ${model} @ ${baseURL}`);

  const messages = [
    {
      role: "system",
      content:
        "你是一个技术情报编辑，只根据给定材料写作，从不补充材料之外的事实。",
    },
    { role: "user", content: prompt },
  ];

  // Reasoning models spend a large hidden budget before emitting content, and
  // they disagree on which parameters they accept: newer ones require
  // max_completion_tokens and reject a custom temperature, older ones only know
  // max_tokens. Try the modern shape first and step down on a rejected param.
  const attempts = [
    { label: "max_completion_tokens+temperature", max_completion_tokens: MAX_COMPLETION_TOKENS, temperature: 0.4 },
    { label: "max_completion_tokens", max_completion_tokens: MAX_COMPLETION_TOKENS },
    { label: "max_tokens", max_tokens: MAX_COMPLETION_TOKENS },
  ];

  let lastError = null;
  for (const { label, ...params } of attempts) {
    try {
      const response = await openai.chat.completions.create({ model, messages, ...params });
      const choice = response.choices?.[0];
      const content = extractResponseText(response);

      console.log(`Request succeeded using: ${label}`);
      console.log(`finish_reason: ${choice?.finish_reason ?? "n/a"}`);
      if (response.usage) console.log(`usage: ${JSON.stringify(response.usage)}`);

      if (!content?.trim()) {
        throw new Error(
          `model returned empty content (finish_reason=${choice?.finish_reason ?? "n/a"}; ${describeResponseShape(response)})`
        );
      }
      return { body: content.trim(), indexed };
    } catch (err) {
      lastError = err;
      logApiError(err, label);
      // Only an explicit rejected-parameter response is worth retrying with a
      // different shape. A successful but unknown response contract will not
      // become compatible by sending the same request two more times.
      if (err?.status !== 400) break;
    }
  }

  throw lastError ?? new Error("all request attempts failed");
}
