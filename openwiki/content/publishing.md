---
type: 领域文档
title: 内容与发布
description: 四种内容集合的 schema、draft 与未来发布 margin 过滤、翻译配对、tag 规则、RSS/搜索边界与 digest 输入约定，以及扩展内容模型时必须同步的注册表与检查。
tags: [content, publishing, schemas, astro, rss, digest]
---

# 内容与发布

内容层全部由 `src/content/config.ts`（zod schema）与 `src/config.ts`（站点常量）定义；正文文件位于 `src/content/{blog,short-stories,originals,digest}/`，本 Wiki 只文档化 schema 与路由，不索引正文。正文完整性由 `scripts/check-content.mjs` 兜底（见 [测试与校验](../operations/testing.md)）。

## 四种内容集合

| 集合 | 类型 | 关键字段（`src/content/config.ts`） | 用途 |
| --- | --- | --- | --- |
| `blog` | `content` | `author`（默认 `SITE.author`）、`pubDatetime`、`modDatetime?`、`title`、`featured?`、`draft?`、`isTranslation?`、`tags`（默认 `["others"]`）、`ogImage?`（≥1200×630 校验或字符串 URL）、`description`（必填）、`canonicalURL?` | 常规文章 |
| `short-stories` | `content` | 同 blog，但 `tags` 默认 `["short-story"]`，无 `isTranslation` | 短篇 |
| `originals` | `content` | 仅 `title`（必填）+ `sourceUrl?` | 翻译对照的原文，按同 slug 与 blog 配对 |
| `digest` | `content` | `date`（coerce date）、`title?`/`description?`（由生成器写，可选以支持手写回退）、`domains`（`z.enum(DIGEST_DOMAINS)`）、`generatedBy`、`reviewed`（默认 false）、`itemCount`、`sources[]`（`title`/`url`/`domain`/`label?`/`publishedAt?`） | 每日 AI 摘要，独立集合 |

代码注释明确说明了 digest 独立于 `blog` 的原因：一天一条，混入 `blog` 会把手工文章淹没在 feed/tag/搜索里；`sources` 用结构化数组而非散文，且每个 URL 都来自抓取的真实 feed，模型无权编造。

## 可见性过滤（draft 与发布 margin）

`src/utils/postFilter.ts` 是列表类页面（首页、归档、tag、RSS、搜索）的统一过滤器：

```ts
return !data.draft && (import.meta.env.DEV || now > pubDatetime - SITE.scheduledPostMargin);
```

- `SITE.scheduledPostMargin = 15 * 60 * 1000`（`src/config.ts`），即**未来 15 分钟内将发布的文章已对列表可见**。
- 开发模式（DEV）跳过时间判断。
- **详情页例外**：`src/pages/posts/[slug]/index.astro`（及 short-stories 同款）的 `getStaticPaths` 只用 `!data.draft` 过滤，因此未来 15 分钟内的文章 URL 已在构建时生成，只是没有任何列表链接指向它——避免“发布瞬间 404”。
- 时间解释统一为 Asia/Shanghai（`astro.config.ts` 顶部 `process.env.TZ`）。

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: an unescaped angle bracket inside a label breaks rendering; rephrase the label. -->
```text
flowchart TD
  E["文章 / 短篇 entry"] --> D{"draft?"}
  D -- 是 --> HIDE["所有页面隐藏"]
  D -- 否 --> M{"详情页 getStaticPaths?"}
  M -- 是 --> PUB["URL 生成，直接可访问"]
  M -- 否 --> T{"now > pubDatetime - 15min 或 DEV?"}
  T -- 是 --> LIST["出现在列表 / RSS / 搜索 / tag"]
  T -- 否 --> FUT["URL 已生成但无列表链接，15 分钟内自动可见"]
```

## 翻译配对

- blog 条目 `isTranslation: true` 时，详情页对照视图依赖同 slug 的 `src/content/originals/<slug>.md`；原文缺失会让译文/原文/对照切换失效（`PostDetails.astro` 用 `sessionStorage["translation-view-mode"]` 记忆视图模式）。
- `scripts/check-content.mjs` 以 **error 级别**拦截“`isTranslation` 但缺 originals 配对”的情况（`checkPost` 内），因此 `pnpm check:content` 失败即发布前拦截。

## tag 规则

- blog 默认 `["others"]`，short-stories 默认 `["short-story"]`（schema 层）；无 tags 时 `check-content.mjs` 给 warning。
- `check-content.mjs` 规则（`TAG_RULES` + `BANNED_TAGS`，依据 `docs/tag-taxonomy.md`）：
  - error：禁用 tag `blog`、`translation`、`node`、`AI`、`GitHub`；
  - warning：含大写、中文、空格、下划线的 tag（规则期望小写 kebab-case；短篇系列保留中文系列 tag 是有意为之，仅提示不阻断）；
  - warning：超过 4 个 tag（taxonomy 偏好 1–3）。
- tag 页聚合 **blog + short-stories** 两个集合（`src/pages/tags/**`，slug 经 `github-slugger`）。

## RSS、搜索与 digest 边界

| 消费面 | 输入 | 源码 |
| --- | --- | --- |
| RSS | 仅 `blog`，经 `getSortedPosts`（即 `postFilter` 后按 `modDatetime ?? pubDatetime` 倒序）；`pubDate` 取 `modDatetime ?? pubDatetime` | `src/pages/rss.xml.ts` |
| 搜索 | 仅 `blog` 非 draft，Fuse.js 按 `title`/`description`（threshold 0.5） | `src/pages/search.astro` + `src/components/Search.tsx` |
| tag 页 | blog + short-stories 合并 | `src/utils/getPostsByTag.ts` |
| digest 页 | 仅 `digest` 集合，`date` 排序、`YYYY/MM/DD` slug、按域分组 | `src/utils/getDigests.ts`、`src/pages/digest/**` |

不变量：**digest 绝不进入 RSS、tag 页或搜索结果**；**short-stories 不进 RSS 与搜索，但进 tag 页**。这两条由集合选择决定，改动时注意别把 `getCollection("blog")` 换成 `getCollection` 全量。

## digest 输入约定

- `domains` 词汇表单一事实源是 `src/config.ts` 的 `DIGEST_DOMAINS = ["angular", "web", "ai", "fullstack"]`；schema（`src/content/config.ts`）与 Node 侧 `scripts/digest/sources.mjs` 的 `DOMAINS` 各自持有一份副本，**两处必须同步**。
- 路由输入：slug 即 `YYYY/MM/DD`（`getSortedDigests` 按 `date` 倒序，`digestPath` 拼 `/digest/{slug}/`）；日期用 UTC 切片（`digestDate` 用 `toISOString()`）避免西半球日期漂移。
- `reviewed: false` 是生成器默认值；`generatedBy` 记录模型名。手写 digest 可省略 `title`/`description` 回退到日期（schema 注释）。

## 扩展内容模型时须同步的面

1. **Node registry**：新增 digest 域 → `src/config.ts` 的 `DIGEST_DOMAINS` + `scripts/digest/sources.mjs` 的 `DOMAINS`/`DOMAIN_LABELS` 同步（含 schema `z.enum` 与 `digest/domain/[domain].astro` 的路由假设）。
2. **路由与工具**：新增 collection 或字段 → `src/pages/**` 对应 `getStaticPaths`、`src/utils/getDigests.ts`/`getSortedPosts.ts` 等聚合工具。
3. **检查脚本**：`scripts/check-content.mjs` 的必填字段/配对/tag 规则。
4. **验证**：改 schema 后跑 `pnpm check:content` 与 `pnpm build`（astro check 会做 zod 推断校验）；只有改了 `src/comments/protocol.ts`、`src/utils/rehype-comment-anchors.ts` 等逻辑才需要跑对应单测。
