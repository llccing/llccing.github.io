---
type: 参考索引
title: 源文件地图
description: 从维护意图到所属源码文件的路径压缩索引：页面族、组件、工具、脚本、Worker、数据与工作流的唯一归属。
tags: [source-map, reference, astro, worker, scripts]
---

# 源文件地图

本页是**路径压缩索引**，不是目录清单：每个维护意图给出唯一 canonical home、主要调用方与聚焦测试。架构分层见 [站点架构总览](./overview.md)。

## 配置与单一事实源

| 意图 | 文件 | 说明 |
| --- | --- | --- |
| 站点元数据/时区/分页 | `src/config.ts` | `SITE`、`LOCALE`、`DIGEST_DOMAINS`、`DIGEST_DOMAIN_LABELS` |
| Astro 构建与 Markdown 插件 | `astro.config.ts` | 集成、插件链、TZ、shiki、image service |
| 内容 schema（四种集合） | `src/content/config.ts` | blog / short-stories / originals / digest 的 zod schema |
| 路径别名 | `tsconfig.json` | `@config`/`@components/*`/`@utils/*` 等 |
| 样式主题 | `tailwind.config.cjs` + `src/styles/base.css` | `skin` 色板、`--color-*` 变量 |
| 依赖/脚本/工具链 | `package.json` | 全部 `pnpm` 命令与依赖版本 |
| Worker 绑定与路由 | `wrangler.jsonc` | D1/Queue/AI 绑定、routes、vars |

## 页面族（src/pages）

| 路由族 | 文件 | 行为要点 |
| --- | --- | --- |
| 首页 | `index.astro` | featured + 最近 4 篇（`getSortedPosts`） |
| 文章归档/详情 | `posts/index.astro`、`posts/[slug]/index.astro` | 分页 10/页；`[slug]` 同时承担文章 slug 与页码（`getPageNumbers`）；详情页只用 `!draft` 过滤 |
| 文章 OG 图 | `posts/[slug]/index.png.ts` | 按 `slugifyStr(post.data.title)` 生成（无 `ogImage` 的文章） |
| 短篇归档/详情 | `short-stories/index.astro`、`short-stories/[slug]/index.astro` | 同 posts 模式，`collection="short-stories"` |
| tag | `tags/index.astro`、`tags/[tag]/index.astro`、`tags/[tag]/[page].astro` | 合并 blog + short-stories；`github-slugger` slugify |
| digest | `digest/index.astro`、`digest/[...slug].astro`、`digest/domain/[domain].astro` | 周/月/归档统计；域时间线；slug 为 `YYYY/MM/DD` |
| projects | `projects/index.astro`、`projects/[slug].astro` | 数据驱动（`src/data/projects.ts`） |
| radio | `radio/index.astro` | `RadioPlayer client:load` |
| 搜索 | `search.astro` | blog-only 非草稿列表 + `SearchBar client:load`（`?q=`） |
| 作者工作区 | `annotations.astro` | `AnnotationOwnerPanel client:load` |
| 静态页 | `about.md`（`AboutLayout`）、`portfolio.astro`、`shanghai/index.astro` | portfolio 用 `src/data/portfolio.resume.json` + `PortfolioExperience`；shanghai 用 `src/data/company-data.ts` + 内联脚本 |
| 端点 | `rss.xml.ts`、`robots.txt.ts`、`og.png.ts`、`404.astro` | RSS 仅 blog；robots 引用 sitemap；`/og.png` 站点级 OG 图 |

## 布局（src/layouts）

| 文件 | 职责 |
| --- | --- |
| `Layout.astro` | HTML 外壳、SEO/OG/GA、`ViewTransitions`、主题脚本 |
| `Main.astro` | 页头 + Breadcrumbs 内容容器 |
| `Posts.astro` | 归档列表 + 客户端目录/tag 过滤（`data-post-filter-root` 内联脚本） |
| `PostDetails.astro` | 文章详情、TOC、翻译对照、`InlineComments`（条件挂载）、Giscus `Comments` |
| `TagPosts.astro` | tag 分页列表 |
| `AboutLayout.astro` | 文章式静态页外壳 |

## 组件（src/components）

| 组件 | 类型 | 归属行为 |
| --- | --- | --- |
| `InlineComments.tsx` | React 岛（`client:only`） | 批注线程、锚点定位、乐观更新、AI 任务状态/轮询/重试；调用方 `PostDetails.astro`；协议见 `src/comments/` |
| `AnnotationOwnerPanel.tsx` | React 岛（`client:load`） | `/annotations/` 作者登录/退出/批注模式开关 |
| `Comments.tsx` | React 岛（`client:only`） | Giscus 讨论挂载（`mapping="pathname"`，repo/category ID 硬编码） |
| `Search.tsx` | React 岛（`client:load`） | Fuse.js 搜索（`title`/`description`，`threshold 0.5`） |
| `RadioPlayer.tsx` | React 岛（`client:load`） | howler.js 播放器、倍速、进度 |
| `portfolio/PortfolioExperience.tsx` | React 岛（`client:load`） | 动画版简历（framer-motion） |
| `Card.tsx` / `Datetime.tsx` | React（服务端渲染，无 client 指令） | 列表卡片与日期显示 |
| `Header.astro`/`Footer.astro`/`Breadcrumbs.astro`/`Pagination.astro`/`Tag.astro`/`ShareLinks.astro`/`Socials.astro`/`LinkButton.astro`/`Hr.astro` | Astro | 导航与页面骨架 |
| `DigestSourceList.astro` | Astro | digest 引用列表渲染（`numbered` 模式） |
| `GoogleAnalytics.astro` | Astro | 仅生产 + `PUBLIC_GA_MEASUREMENT_ID` |

## 评论/批注协议与前端状态（src/comments）

| 文件 | 职责 | 聚焦测试 |
| --- | --- | --- |
| `protocol.ts` | 类型、marker（`rowan-annotation:v1` / `rowan-ai-reply:v1` / `rowan-ai-queue:v1`）、限额（`COMMENT_LIMITS`）、base64url marker 序列化/解析、`normalizeArticlePath`、`extractSameSiteArticlePaths` | `protocol.test.ts` |
| `optimistic.ts` | 乐观新增/替换/删除线程与回复 | `optimistic.test.ts` |
| `polling.ts` | `startSequentialPolling` 顺序轮询（用于 AI 任务进行中 1.5s 轮询） | `polling.test.ts` |

## 工具（src/utils）

| 文件 | 职责 |
| --- | --- |
| `postFilter.ts` | draft + 发布 margin 过滤（`SITE.scheduledPostMargin`） |
| `getSortedPosts.ts` | `postFilter` 后按 `modDatetime ?? pubDatetime` 倒序 |
| `getPagination.ts` / `getPageNumbers.ts` | 分页切片与页号 |
| `getUniqueTags.ts` / `getPostsByTag.ts` / `slugify.ts` | tag 聚合与 slugify（github-slugger） |
| `getDigests.ts` | digest 读取/排序/周月归档/按域分组（`digestDate` 用 UTC 切片避免西半球日期漂移） |
| `remark-reading-time.ts` | 阅读时长 |
| `rehype-comment-anchors.ts` | 批注锚点属性注入（有单测） |
| `generateOgImages.tsx` + `og-templates/` | satori → resvg 生成 1200×630 OG 图 |

## 数据（src/data）

| 文件 | 内容 |
| --- | --- |
| `projects.ts` | projects 页与 case study 的唯一数据源（`Project` 类型、featured/status/accent） |
| `radio-data.ts` | Radio 分类/曲目（音频托管在腾讯 COS `reading-audios-1308187607.cos.ap-shanghai.myqcloud.com`） |
| `company-data.ts` | `/shanghai/` 415 家公司数据（`ALL_COMPANY`） |
| `portfolio.resume.json` | `/portfolio/` 简历数据 |

## 脚本（scripts）

| 文件 | 职责 |
| --- | --- |
| `check-content.mjs` | 内容完整性检查（slug、翻译配对、tag 规则、重复 slug） |
| `digest/sources.mjs` | digest 源注册表（13 个源、4 域、caps）——与 `src/config.ts` 的 `DIGEST_DOMAINS` 必须同步 |
| `digest/fetch.mjs` / `state.mjs` / `summarize.mjs` / `generate.mjs` | 抓取→去重→限额→摘要→写文件的每日 digest 管线（详见 [AI 管线](../ai/pipelines.md)） |
| `comments/export-annotations.mjs` | 把 GitHub Discussions 批注导出为 JSON 备份 |
| `comments/d1-backup.ts` / `d1-cli.ts` / `import-annotations-to-d1.ts` / `reconcile-annotations-d1.ts` | Discussion→D1 数据迁移/对账工具链（详见 [运行时与路由](../runtime/routes.md)） |
| `comments/respond-to-ai.ts` | GitHub Action 路径的 AI 批注回答（OpenAI Responses API） |

## Worker 与迁移（workers、migrations）

| 路径 | 职责 |
| --- | --- |
| `workers/comments-api/src/index.ts` | 路由表、OAuth/JWT 会话/CSRF、CORS、ETag、Queue consumer、Workers AI 调用、GitHub 镜像调度 |
| `workers/comments-api/src/d1.ts` | D1 全部读写：列表/创建/编辑/软删、AI job claim/complete/retry/fail、mirror 状态机 |
| `workers/comments-api/test/index.test.ts`、`test/d1.test.ts` | Worker 路由/会话/CSRF/镜像失败与 D1 行为的单测 |
| `migrations/comments-api/0001_annotations_shadow.sql` | 初始表（articles/annotations/replies/annotation_revisions/ai_jobs） |
| `migrations/comments-api/0002_d1_primary.sql` | 加 `github_mirror_state` 三表列与索引 |
| `migrations/comments-api/0003_queue_ai.sql` | `ai_jobs.reply_id/updated_at`、`replies.ai_job_id` 唯一部分索引、状态索引 |

## 工作流（.github/workflows）

| 文件 | 触发 | 职责 |
| --- | --- | --- |
| `deploy.yml` | push main | 构建并发布 `dist/` 到 `gh-pages`（GitHub Pages 回滚路径，含 `CNAME rowanliu.com`） |
| `daily-blog-generator.yml` | cron 02:00 UTC + dispatch | 生成 digest、`check:content` 门禁、以“author=Rowan / committer=bot”提交回 main |
| `annotation-ai.yml` | discussion_comment created/edited | 旧版 GitHub 路径 AI 批注回答（跳过含 `rowan-ai-queue:v1` 的镜像批注） |
| （暂无） | — | OpenWiki 当前为本地/手动试点，尚未启用自动更新 workflow |

## 快速定位示例

- “批注保存后没出现”→ `workers/comments-api/src/{index,d1}.ts` + `src/components/InlineComments.tsx` + `src/comments/protocol.ts`；先看 `handleCreateComment` 与 `createD1Annotation`。
- “digest 今天没生成”→ `scripts/digest/generate.mjs` + `daily-blog-generator.yml` + `scripts/digest/{sources,fetch,state,summarize}.mjs`。
- “某文章列表/搜索里没出现”→ `src/utils/postFilter.ts`（margin/draft）+ 对应页面 `getStaticPaths`。
- “tag 页与文章页路由冲突”→ `src/pages/tags/[tag]/[page].astro` 与 `src/utils/getUniqueTags.ts`。
