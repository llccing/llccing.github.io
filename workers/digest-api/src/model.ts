import { DOMAIN_LABELS } from "./sources";
import type { DigestItem } from "./types";

const MODEL_TIMEOUT_MS = 150_000;

export class ModelError extends Error {
  constructor(readonly status: number | undefined, message: string) { super(message); }
}

function responseText(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (typeof payload?.output_text === "string") return payload.output_text.trim();
  return "";
}

function promptFor(items: DigestItem[], date: string): string {
  const lines: string[] = [];
  let index = 0;
  for (const domain of Object.keys(DOMAIN_LABELS)) {
    const domainItems = items.filter(item => item.domain === domain);
    if (!domainItems.length) continue;
    lines.push(`\n## ${DOMAIN_LABELS[domain]} (${domain})`);
    for (const item of domainItems) { index += 1; lines.push(`[${index}] ${item.sourceLabel} — ${item.title}`); if (item.summary) lines.push(`    ${item.summary.slice(0, 600)}`); }
  }
  return `以下是 ${date} 抓取到的技术动态原始条目，按领域分组：\n${lines.join("\n")}\n\n请写一份中文简报，要求：\n1. 按领域分节，标题用二级标题（##），格式为「领域中文名」。\n2. 每个领域下归纳成 2-5 句话，说明发生了什么、为什么值得关注。\n3. 引用条目时使用 [1]、[2] 等编号，编号必须对应材料。\n4. 不要输出 URL、链接或 Markdown 链接。\n5. 不要编造材料之外的事实。\n6. 不要写开场白、结语或总结小节。\n7. 只输出正文 Markdown，不要 frontmatter。`;
}

function validBody(body: string, itemCount: number): boolean {
  if (!body || !/^##\s+\S/m.test(body)) return false;
  const citations = [...body.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1]));
  return citations.every(value => value >= 1 && value <= itemCount);
}

export async function summarize(items: DigestItem[], date: string, apiKey: string, baseUrl: string, model: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const normalizedBaseUrl = baseUrl.replace(/\/$/, "").replace(/(?<!\/v1)$/, "/v1");
    const response = await fetch(`${normalizedBaseUrl}/chat/completions`, {
      method: "POST", signal: controller.signal,
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: "你是一个技术情报编辑，只根据给定材料写作，从不补充材料之外的事实。" }, { role: "user", content: promptFor(items, date) }], max_completion_tokens: 8000, temperature: 0.4 }),
    });
    const raw = await response.text();
    let payload: any;
    try { payload = JSON.parse(raw); } catch { payload = null; }
    if (!response.ok) throw new ModelError(response.status, `HTTP ${response.status}`);
    const body = responseText(payload);
    if (!validBody(body, items.length)) throw new ModelError(undefined, "model returned invalid Markdown or citation");
    return body;
  } catch (error) {
    if (error instanceof ModelError) throw error;
    throw new ModelError(undefined, error instanceof Error ? error.message : String(error));
  } finally { clearTimeout(timeout); }
}
