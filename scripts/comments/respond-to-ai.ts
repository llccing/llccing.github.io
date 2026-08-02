import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import {
  AI_REPLY_MARKER,
  extractAnnotationText,
  extractSameSiteArticlePaths,
  normalizeArticlePath,
  parseAnnotationMetadata,
} from "../../src/comments/protocol";

type DiscussionCommentEvent = {
  action: "created" | "edited" | "deleted";
  comment: {
    body: string;
    node_id: string;
    user: { login: string };
  };
  discussion: { node_id: string; title: string };
  repository: { full_name: string };
};

const GRAPHQL_URL = "https://api.github.com/graphql";
const OWNER_LOGIN = "llccing";

async function githubGraphQL<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "rowan-blog-ai-annotations",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(
      `GitHub GraphQL failed: ${payload.errors?.map(error => error.message).join("; ") ?? response.status}`
    );
  }
  return payload.data;
}

async function hasExistingReply(token: string, commentId: string): Promise<boolean> {
  const data = await githubGraphQL<{
    node: null | { replies: { nodes: { body: string }[] } };
  }>(
    token,
    `query ExistingAiReply($id: ID!) {
      node(id: $id) {
        ... on DiscussionComment {
          replies(first: 50) { nodes { body } }
        }
      }
    }`,
    { id: commentId }
  );
  return Boolean(
    data.node?.replies.nodes.some(
      reply => reply.body.includes(AI_REPLY_MARKER) && reply.body.includes(commentId)
    )
  );
}

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return markdownFiles(target);
      return entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
    })
  );
  return nested.flat();
}

function frontmatterSlug(markdown: string): string | null {
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  return frontmatter?.[1].match(/^slug:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1] ?? null;
}

async function loadArticle(articlePath: string, limit: number): Promise<string> {
  const match = articlePath.match(/^\/(posts|short-stories)\/([^/]+)\/$/);
  if (!match) return "";
  const collection = match[1] === "posts" ? "blog" : "short-stories";
  const files = await markdownFiles(path.join(process.cwd(), "src", "content", collection));
  for (const file of files) {
    const markdown = await readFile(file, "utf8");
    const fileSlug = path.basename(file, ".md");
    if (frontmatterSlug(markdown) === match[2] || fileSlug === match[2]) {
      return markdown.slice(0, limit);
    }
  }
  return "";
}

async function addReply(
  token: string,
  discussionId: string,
  replyToId: string,
  body: string
): Promise<void> {
  await githubGraphQL(
    token,
    `mutation AddAiReply($input: AddDiscussionCommentInput!) {
      addDiscussionComment(input: $input) { comment { id url } }
    }`,
    {
      input: { discussionId, replyToId, body },
    }
  );
}

async function main(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const githubToken = process.env.GITHUB_TOKEN;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!eventPath || !githubToken || !openaiApiKey) {
    throw new Error("GITHUB_EVENT_PATH, GITHUB_TOKEN and OPENAI_API_KEY are required");
  }

  const event = JSON.parse(await readFile(eventPath, "utf8")) as DiscussionCommentEvent;
  const metadata = parseAnnotationMetadata(event.comment.body);
  const question = extractAnnotationText(event.comment.body);
  if (
    event.action === "deleted" ||
    event.comment.user.login !== OWNER_LOGIN ||
    event.repository.full_name !== "llccing/llccing.github.io" ||
    !metadata ||
    metadata.path !== normalizeArticlePath(event.discussion.title) ||
    !/@ai\b/i.test(question)
  ) {
    console.log("No eligible @ai annotation in this event.");
    return;
  }
  if (await hasExistingReply(githubToken, event.comment.node_id)) {
    console.log("An AI reply already exists for this annotation.");
    return;
  }

  const linkedPaths = extractSameSiteArticlePaths(question).filter(
    linkedPath => linkedPath !== metadata.path
  );
  const currentArticle = await loadArticle(metadata.path, 12_000);
  const linkedArticles = await Promise.all(
    linkedPaths.map(async linkedPath => ({
      path: linkedPath,
      markdown: await loadArticle(linkedPath, 6_000),
    }))
  );
  const references = linkedArticles
    .filter(article => article.markdown)
    .map(article => `\n\n### 关联文章 ${article.path}\n${article.markdown}`)
    .join("");

  const client = new OpenAI({
    apiKey: openaiApiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    instructions:
      "你是 Rowan 博客里的文章批注助手。用中文直接回答作者的问题。优先依据给出的选中文字、上下文和文章原文；不确定时明确说明，不要编造文章没有提供的事实。回答应简洁但完整，通常 2-5 段。可以使用 Markdown。若引用关联文章，只引用输入中确实存在的路径。",
    input: `文章路径：${metadata.path}\n锚点标题：${metadata.anchor.headingId ?? "无"}\n选中文字：\n${metadata.anchor.exact}\n\n选区前文：${metadata.anchor.prefix}\n选区后文：${metadata.anchor.suffix}\n\n作者问题：\n${question.replace(/@ai\b/gi, "").trim()}\n\n### 当前文章 Markdown\n${currentArticle || "（仓库中未找到文章原文）"}${references}`,
  });
  const answer = response.output_text.trim();
  if (!answer) throw new Error("OpenAI returned an empty answer");

  await addReply(
    githubToken,
    event.discussion.node_id,
    event.comment.node_id,
    `<!-- ${AI_REPLY_MARKER} ${event.comment.node_id} -->\n\n${answer}`
  );
  console.log("AI reply created.");
}

await main();
