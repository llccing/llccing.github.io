---
type: 测试文档
title: 测试与校验
description: package.json 每个 pnpm 命令校验什么、8 个测试文件各自覆盖的行为与归属、验证命令矩阵，以及仓库没有专用浏览器集成套件的边界。
tags: [testing, vitest, wrangler, check, validation]
---

# 测试与校验

仓库没有专用浏览器集成套件（`package.json` 无 playwright/cypress 依赖）；验证体系由 **vitest 单测**（8 个文件）、**Astro 类型/构建**、**Worker 类型 + dry-run** 与 **内容完整性脚本** 组成。选择“最窄且能证明该行为”的命令，不要把 `pnpm build` 当默认。

## 命令矩阵（`package.json`）

| 命令 | 执行内容 | 验证什么 | 限制 / 注意 |
| --- | --- | --- | --- |
| `pnpm test` | `vitest run` | 全部单测（默认 8 个文件） | 不覆盖渲染/构建产物 |
| `pnpm test -- <路径>` | vitest 过滤 | 指定测试文件/目录 | 最窄单测入口，如 `pnpm test -- workers/comments-api/test/d1.test.ts` |
| `pnpm astro check` | Astro 类型检查 | pages/components 的类型与 schema 推断 | 不构建、不产 dist |
| `pnpm build` | `astro check && astro build && jampack ./dist` | 类型 + 完整静态构建 + 产物优化 | 最接近完整校验；较慢 |
| `pnpm check:worker` | `tsc --noEmit -p workers/comments-api/tsconfig.json && wrangler deploy --dry-run` | Worker 类型与 wrangler 配置 | **不部署**；生产 Worker 改动后仍需真实 `wrangler deploy`（见 [部署与运维](./deployment.md)） |
| `pnpm check:content` | `node scripts/check-content.mjs` | 内容完整性（slug、翻译配对、tag 规则、必填字段） | 不查构建；`--quiet` 只报 error |
| `pnpm lint` | `eslint .` | 代码规范（astro/ts） | — |
| `pnpm format:check` | `prettier --check . --plugin=prettier-plugin-astro` | 格式化 | `pnpm format` 会写文件 |
| `pnpm digest` / `digest:dry` / `digest:offline` | `node scripts/digest/generate.mjs [--dry-run|--offline]` | digest 管线（见 [AI 管线](../ai/pipelines.md)） | `digest` 需要 `AI_API_KEY`；`--dry-run` 不调模型；`--offline` 只用于本地开发，**不是 CI 回退** |
| `pnpm comments:export` | `node scripts/comments/export-annotations.mjs` | 导出 GitHub Discussions 批注 JSON 备份 | 需要 `GITHUB_TOKEN` 环境 |
| `pnpm comments:d1:import` / `comments:d1:reconcile` | `tsx scripts/comments/…` | Discussion→D1 导入/对账（见 [运行时与路由](../runtime/routes.md)） | 必须二选一 `--local`/`--remote`；对账 mismatch 时非零退出 |
| `pnpm dev` / `pnpm preview` | astro dev / preview | 本地开发 / 预览构建产物 | — |

## 测试文件清单与行为映射

| 文件 | 归属 | 验证行为 |
| --- | --- | --- |
| `src/comments/protocol.test.ts` | 批注协议 | marker base64url 序列化往返（UTF-8 中文锚点元数据不泄 JSON 键）、`normalizeArticlePath` 只接受规范文章路径（拒绝 `/admin/*` 与路径穿越）、`extractSameSiteArticlePaths` 提取并去重最多 3 个站内链接 |
| `src/comments/optimistic.test.ts` | 前端状态 | 乐观新增/替换/删除线程与回复，编辑时保持线程聚合 |
| `src/comments/polling.test.ts` | 前端轮询 | `startSequentialPolling` 顺序执行、取消后不再调度（AI job 进行中 1.5s 轮询） |
| `src/utils/rehype-comment-anchors.test.ts` | Markdown 插件 | 为 `p/h2/h3/h4/li/blockquote/pre/figure` 注入稳定的 `data-comment-block-id`/`data-comment-heading-id` |
| `workers/comments-api/test/index.test.ts` | Worker 路由层 | 路由分发、owner 会话（Bearer/cookie）、CSRF 校验、CORS origin 白名单、OAuth state 校验、镜像失败路径标 `failed` 且 HTTP 不失败、Queue consumer 对重复/已完成 job 直接 ack |
| `workers/comments-api/test/d1.test.ts` | D1 数据层 | `createD1Annotation`/`createD1Reply`/`updateD1Resource`/`deleteD1Resource`（软删）/`getD1CommentList`（排除已删）的 SQL 与映射、`completeD1AiJob` 幂等、版本号递增 |
| `scripts/comments/d1-backup.test.ts` | 迁移工具 | SQL 字符串转义、`generateImportSql` 幂等 upsert 且**不清除软删除**、`compareRecordSets` 对 `missing`/`field_mismatch`/`unexpected` 的分类、`parseWranglerRows` JSON 解析 |
| `scripts/digest/summarize.test.mjs` | digest 摘要 | `extractResponseText` 兼容 Chat Completions（含 multipart）与 Responses（`output_text`/嵌套 `output`）、text/plain 原始 Markdown、JSON 字符串响应；拒绝 HTML 错误页等非 Markdown 信封；`describeResponseShape` 形状描述 |

> 检索提示：`workers/comments-api/test/index.test.ts` 较大，搜索 suite 名 `"comments Worker"` 或具体测试名（如 `"contains an asynchronous GitHub mirror failure after D1 success"`、`"acknowledges an invalid Queue payload without retrying the batch"`）可直达相关段落；`d1.test.ts` 用 suite 名 `"D1 primary annotation storage"`。

## 验证选择建议

- **改 Worker 逻辑**：`pnpm test -- workers/comments-api/test/index.test.ts`（或 `d1.test.ts`）+ `pnpm check:worker`；真实部署按 [部署与运维](./deployment.md)。
- **改协议/前端批注**：`pnpm test -- src/comments`。
- **改内容 schema/正文**：`pnpm check:content && pnpm build`（astro check 覆盖 zod 推断）。
- **改 digest 管线**：`pnpm digest:dry` + `pnpm test -- scripts/digest/summarize.test.mjs`；完整 CI 行为由 `daily-blog-generator.yml` 门禁（`check:content`）验证。
- **改部署/工作流**：`pnpm check:worker && pnpm build`；页面构建变量配对与 `[skip ci]` 纪律见 [部署与运维](./deployment.md)。
- **不做默认**：不要为一次单测级改动跑 `pnpm build`；不要用 `--offline` digest 结果替代真实 CI；`check:worker` 的 dry-run 不是部署测试。
