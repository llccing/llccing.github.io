---
type: 排障手册
title: 排障手册
description: 按故障症状分类的排查路径：构建/内容、digest、批注读写、认证与 CORS、GitHub 镜像、AI 任务、Worker 配置与 Pages 发布；每项给出归属、首查文件与安全验证命令。
tags: [runbook, troubleshooting, operations, worker, digest, build]
---

# 排障手册

按“症状 → 归属 → 首查文件 → 安全验证命令”组织。所有验证命令均不写生产数据（`--dry-run`、`--local`、只读 API 等）；需要人工判断处已注明。首查符号与文件的完整归属见 [源文件地图](../architecture/source-map.md)。

## 1. 构建与内容检查失败

| 症状 | 归属 | 首查文件 | 安全验证 |
| --- | --- | --- | --- |
| `pnpm build` 在 `astro check` 报类型/schema 错 | 页面/组件/schema | 报错文件、`src/content/config.ts` | `pnpm astro check` |
| `pnpm check:content` 报 error | 正文 frontmatter | `scripts/check-content.mjs`、被报文件（`blog`/`short-stories`/`originals`） | `pnpm check:content --quiet` |
| 文章在列表/搜索里不出现 | 可见性过滤 | `src/utils/postFilter.ts`、`src/pages/posts/[slug]/index.astro` | `pnpm dev` 下 DEV 分支跳过 margin；或改 `pubDatetime` 临时验证 |
| 翻译对照视图空白 | 配对缺失 | `src/content/originals/<slug>.md`、`check-content.mjs` 的翻译配对检查 | `pnpm check:content` |

常见根因：`pubDatetime` 在未来 15 分钟内（列表隐藏属预期，详情 URL 已生成）；`isTranslation: true` 缺 originals；tag 用了禁用词（`blog`/`translation`/`node`/`AI`/`GitHub`）。

## 2. digest 缺失或异常

| 症状 | 归属 | 首查文件 | 安全验证 |
| --- | --- | --- | --- |
| 今天没生成 digest | cron / 脚本 | `.github/workflows/daily-blog-generator.yml`、`scripts/digest/generate.mjs` | `pnpm digest:dry`（抓取+去重，不调模型） |
| digest 里全是旧条目 / 引用不更新 | 去重与注册表 | `scripts/digest/state.mjs`（URL 永久去重）、`scripts/digest/sources.mjs` | `pnpm digest:dry` 观察 `New:` 计数 |
| 某源一直失败 warning | 源 feed | `scripts/digest/fetch.mjs`（15s 超时）、`sources.mjs` | 手动 curl 该源 URL；`pnpm digest:dry` |
| digest 提交后 Pages 没更新 | 提交标记 | `daily-blog-generator.yml` 的 commit 步骤 | 检查提交消息是否误带 `[skip ci]`（注释明确禁止） |
| 模型返回异常内容 | 摘要契约 | `scripts/digest/summarize.mjs`（`extractResponseText`） | `pnpm test -- scripts/digest/summarize.test.mjs` |

CI 语义：无新条目时 workflow 不提交也不报错（正常）；有改动时必须过 `check:content` 才提交。

## 3. 批注读取失败（页面无批注）

| 症状 | 归属 | 首查文件 | 安全验证 |
| --- | --- | --- | --- |
| `GET /api/comments` 404 | Worker 路由未生效 | `wrangler.jsonc` 的 `routes`、`workers/comments-api/src/index.ts` 的 `routeRequest` | `curl https://rowanliu.com/api/comments?path=/posts/example/`；`curl https://rowan-blog-comments.lcf33123.workers.dev/health` |
| 返回 `invalid_path` | 前端传了非规范路径 | `src/comments/protocol.ts` 的 `normalizeArticlePath` | 检查文章路径格式（`/posts/<slug>/`，全小写 kebab） |
| 请求 304 但前端没缓存 | ETag 语义 | `handleGetComments`（`commentsEtag`） | 带 `If-None-Match` 复测 |
| 页面没挂批注 UI | 构建变量 | `src/layouts/PostDetails.astro` 的 `PUBLIC_INLINE_COMMENTS` 判断 | 确认构建注入 `PUBLIC_INLINE_COMMENTS=true`（见 [部署与运维](./deployment.md)） |

## 4. 认证与 CORS

| 症状 | 归属 | 首查文件 | 安全验证 |
| --- | --- | --- | --- |
| OAuth start 报 `invalid_origin` | origin 不在白名单 | `wrangler.jsonc` 的 `ALLOWED_ORIGINS`、`handleOAuthStart` | 核对请求 Origin 与 vars |
| OAuth 后回到 preview 但未登录 | 跨源 hash 会话 | `handleOAuthCallback`（`rowan-comments-auth=` hash）、`InlineComments.tsx` 读 hash | 检查 URL hash 是否被清理逻辑误删 |
| owner 写接口 401 | 会话缺失/过期 | `requireOwnerSession`（8 小时 JWT） | 重新登录 `/annotations/` |
| 写接口 403 `csrf_invalid` | CSRF 头缺失/不匹配 | `requireOwnerSession` 的 `requireCsrf` 分支 | 确认带 `X-CSRF-Token`（来自 `GET /api/owner/session`） |
| 503 `setup_required` | Worker secret 未配置 | `requireSecret`（`GITHUB_TOKEN`/`GITHUB_OAUTH_CLIENT_ID`/`GITHUB_OAUTH_CLIENT_SECRET`/`SESSION_SECRET`） | `wrangler secret list`（只列名称，不泄露值） |

## 5. GitHub 镜像失败

| 症状 | 归属 | 首查文件 | 安全验证 |
| --- | --- | --- | --- |
| 批注保存成功但 GitHub Discussions 无评论 | 异步镜像 | `scheduleGitHubMirror`、日志 `github_mirror_failed`、资源 `github_mirror_state` | 查 Worker 日志 `github_mirror_failed`；编辑该批注触发重试 |
| 镜像状态卡 `pending` | 镜像队列未执行 | `ensureGitHubDiscussion`、`findDiscussion` | 查 `ctx.waitUntil` 是否有异常被吞（`github_mirror_state_update_failed` 日志） |
| 镜像失败后无法恢复 | 状态机 | `markResourceMirrorFailed`、`scheduleGitHubMirror` | 已镜像资源的更新镜像失败可在下次编辑时重试恢复；创建即失败（`github_node_id` 为 `pending:` 占位）的资源无自动重试，需人工介入（状态机与限制见 [运行时与路由](../runtime/routes.md)） |

## 6. AI 任务失败

| 症状 | 归属 | 首查文件 | 安全验证 |
| --- | --- | --- | --- |
| 批注带 `@ai` 但没有回答 | 投递或推理失败 | `enqueueAiJob`、`processAiMessage`；日志 `comments_ai_metric` status=failed、`comments_ai_enqueue_failed` | `GET /api/comments` 看线程 `aiJob` 状态与 `errorCode` |
| job 卡 `answering` | 处理中或死信 | `claimD1AiJob`、Queue consumer 重试 | 等待指数退避（≤3 次）；之后 `POST /api/owner/annotations/:id/ai/retry` |
| `ai_empty_response` / `inference_failed` | 模型输出异常 | `answerAiJob`（Workers AI `@cf/zai-org/glm-4.7-flash`） | `ai/retry` 重试；查 `enable_thinking:false` 参数 |
| 双份回答 | 双路径竞争 | `annotation-ai.yml` 的 `rowan-ai-queue:v1` 排除、`respond-to-ai.ts` 的 `hasExistingReply` | 检查镜像回复是否带 `rowan-ai-queue:v1`（见 [AI 管线](../ai/pipelines.md)） |

## 7. Worker 配置问题

| 症状 | 归属 | 首查文件 | 安全验证 |
| --- | --- | --- | --- |
| `pnpm check:worker` 失败 | 类型或 wrangler 配置 | `workers/comments-api/tsconfig.json`、`wrangler.jsonc` | `pnpm check:worker`（dry-run，安全） |
| binding 找不到（`ANNOTATIONS_DB`/`AI_JOBS`/`AI`） | 绑定名与 `Env` 不一致 | `wrangler.jsonc` ↔ `workers/comments-api/src/index.ts` 的 `Env` | `pnpm check:worker` 的 dry-run 即校验绑定 |
| Queue 消息不消费 | consumer 配置 | `wrangler.jsonc` 的 `queues.consumers`（`max_batch_size:1`、`max_retries:3`） | 查 Worker 日志 `comments_ai_invalid_message`/`comments_ai_metric` |

## 8. Pages 发布问题

| 症状 | 归属 | 首查文件 | 安全验证 |
| --- | --- | --- | --- |
| push main 后生产没更新 | Pages 集成或构建失败 | Cloudflare 控制台构建日志（仓库外）；`docs/cloudflare-first-migration-handoff.md` | 本地 `pnpm build` 复现；对比 `dist/` 是否生成 |
| 批注 UI 在生产不工作 | 构建变量缺失 | `deploy.yml` env、`src/layouts/PostDetails.astro` | 确认 `PUBLIC_INLINE_COMMENTS=true` 与 `PUBLIC_COMMENTS_API_URL` 配对注入 |
| 需要回滚 | 平台级操作 | 见 [部署与运维](./deployment.md) 的“回滚与故障恢复” | Pages/Worker 版本回滚按 handoff 记录执行 |

## 通用纪律

- 先复现再动手：所有写路径先在 `pnpm dev` + `wrangler dev`（本地 D1）或 `--local` 迁移工具上验证。
- 日志关键字：`comments_d1_metric`、`github_mirror_failed`、`comments_ai_metric`、`comments_ai_enqueue_failed`、`request_failed`、`setup_required`（均为结构化 JSON，不带正文/secret）。
- 不确定的推断不要当事实写入文档；本手册标注的 `Needs confirmation` 项见 [快速入口](../quickstart.md) 的 Backlog。
