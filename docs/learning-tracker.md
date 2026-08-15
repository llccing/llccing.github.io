# 学习与写作进度追踪

> 2026-07 起。三条线并行，总预算每周 4-5 小时。
> **要按顺序执行请看 [plan-2026-h2.md](./plan-2026-h2.md)**，本文件是方法与状态的索引。
> 详细文档：[Angular 跟踪](./angular-weekly-log.md) · [AI 项目理解](./ai-project-comprehension.md) · [AI 环境与 Skill 实践](./ai-workflow-practice.md) · [选题清单](./blog-topics-plan.md)

## 三条线

| 线 | 目标 | 载体 | 节奏 |
| --- | --- | --- | --- |
| A. Angular 跟进 | 跟上最新趋势，并在 blog 上体现对 Angular 的深入理解 | 本仓库 blog | 周记录，月出文 |
| B. 儿童识字项目 | 从「AI 的项目」变成「我的项目」，跑通产品验证 | Magic Literacy Garden | 每周末 2-3 h |
| C. AI 时代个人实践 | 从环境配置进阶到 Skill / Agent 工程 | 跨项目，沉淀成 blog | 随 B 推进 |

三条线不是并列的三份工作量。C 主要是 A 和 B 的副产品——做 B 的过程本身就在产生 C 的素材。

## 为什么控制在每周 4-5 小时

git 历史显示的真实节奏：3 月 daily english 日更后停更，4-6 月集中爆发，7 月几乎空白。带娃 + WLB 的约束是客观的，高频承诺在这个节奏里活不长。宁可少写但不断。

| 时间 | 事情 | 预算 |
| --- | --- | --- |
| 工作日某晚 | Angular 跟踪，记 log | 30-60 min |
| 周末 | 识字园推进（同时产生 C 的素材） | 2-3 h |
| 每月一次 | log 提炼成 1 篇 Angular 文章 | 1-2 h |

---

## A. Angular 跟进

目标不只是「知道有什么新东西」，而是**在 blog 上体现深入理解**。这两件事的差距就是本节的重点。

详细方案见 [angular-weekly-log.md](./angular-weekly-log.md)。核心是输入按周、输出按月，三层信息源只在一级源出信号时才往下追。

### 怎么体现「深入」而不是「知道」

翻译管道已枯竭（[tracker](./riegler-angular-translation-tracker.md) 里到 2025-04 全部 done），正好从「译」转「写」。三个别人写不了的角度：

1. **PR / commit 级机制解析** — 中文圈几乎无人做到这个粒度，已有 30+ 篇 Angular 文章是延伸基础
2. **生产项目视角** — 国泰值机是真实 Angular + Node BFF 生产系统，「这个特性我们能不能用、为什么不能用」不可替代
3. **升级路径的真实代价** — 已有 `angular-upgrade-13-17.md`、`angular-version-update.md` 的积累

### 进度

- [ ] 订阅三层信息源（GitHub Watch → Custom → Releases 起步）
- [ ] 确认当前稳定版与下一大版本时间点
- [ ] 记录第一周
- [ ] 产出第一篇月度文章

---

## B. 儿童识字项目

### 现状（2026-07-26 核对）

工程闭环已完成，**不是「待上线」阶段**：

- 生产环境在跑：`words.xindamate.com` + `api.words.xindamate.com`（Cloudflare Pages + Worker + D1）
- 6 个 feature flag，每个都写明关闭后行为
- `rollout.md` 有量化回滚阈值，`metrics.md` 有埋点字典 + 数据边界声明
- Vitest 覆盖领域规则与 Worker 关键路径
- 幂等写入口 + localStorage 快照 + pending 重放

缺的是**产品验证**，不是工程能力。

### B1. 重新理解项目

方法详见 [ai-project-comprehension.md](./ai-project-comprehension.md)：读测试当规格 → 主动破坏验证 → 追链路 → 独立修 bug。5-8 小时，可拆两三个周末。

- [ ] 读 `src/domain/` 9 个文件 + 配套测试（2-3 h）
- [ ] 破坏性验证：改代码，先预测再跑测试（1 h）
- [ ] 追链路一：提交一次复习，从点击到 D1（1 h）
- [ ] 追链路二：离线添字 → 恢复网络后的重放（0.5-1 h）
- [ ] 不用 AI 独立修一个 bug（1-2 h）
- [ ] 用自己的话重写 `docs/domain.md`，与原版对比

**落到项目里的动作**（B1 的顺带产出，不额外占时间）：

- [ ] 在识字园建 `docs/ai-practice-log.md`，记录每次 AI 协作的返工点
- [ ] 在 `AGENTS.md` 补一条：`src/domain/` 与 `worker/src/index.ts` 的改动必须人工逐行 review

第二条是防止理解再次流失的关键。UI 那 4198 行可以放手给 AI，但 745 + 2384 行的核心资产变成黑箱就等于放弃项目所有权。

### B2. 跨天保持复测

`docs/product/opportunity-backlog.md` 里 P1 状态是 Recommended，未开始。这是唯一能回答「这产品对 Julianna 到底有没有用」的实验，其余都是工程优化。

- [ ] 设计实验：固定字表，24-72 小时后复测
- [ ] 干扰项人工审核（不接 AI，按自己的审计结论）
- [ ] 跑一轮，记录首次正确率与延迟召回
- [ ] 判断产品假设是否成立

### B3. 待办（来自自己的审计，不要提前做）

按 `docs/product/audit-2026-07-20.md` 优先级：P0 测量口径 → P1 → P2。语境补字只做不计分 shadow probe。

### 怎么体现在 blog 上

B 的每个阶段都有对应文章，见下方选题 10-12、14、16。原则是**做完再写**，不要先写。

---

## C. AI 时代个人实践

详细方案见 [ai-workflow-practice.md](./ai-workflow-practice.md)。

### 现状盘点

已完成的部分（比自我评估的「比较基础」要高）：

- 多套环境跑通：Claude Code、Codex（含 Cloud）、Grok、OpenClaw 自托管，含模型切换与第三方代理
- 项目级 skill 两个，都写得很克制：`project-release`（固化 Worker → D1 → Pages 部署顺序，防止 AI 用通用发布流程乱猜）、`literacy-feature-review`
- 项目级 agent：`literacy-product-lead`、`literacy-learning-reviewer`、`child-ux-reviewer`，只读评审 + 主 agent 独占写权限
- 全局 skill 11 个，但基本是 Cloudflare 官方提供的，非自己编写

### 差距在哪

环境配置是**一次性投入**，配好就不再增值，所以感觉「基础」是对的。真正的能力在配置之上：

| 层次 | 现状 |
| --- | --- |
| 环境配置（模型切换、代理、云端） | ✅ 已完成 |
| 项目约定（AGENTS.md / CLAUDE.md） | ✅ 已完成，且质量高 |
| Skill 工程（把重复流程固化） | 🟡 有 2 个，还可扩展 |
| 多 Agent 协作（角色分工、权限边界） | 🟡 有 3 个只读 agent，用过 1 次正式评审 |
| 可复用方法论（跨项目沉淀） | ❌ 未开始 |

### 进度

- [ ] 安全整改：`~/.claude/settings.json` 里的 token 改成环境变量注入，并轮换已暴露的 key
- [x] 给 blog 仓库补 1 个自写 skill —— `blog-publish-check`（2026-07-26 完成）
- [ ] 再跑一次多 agent 评审，对比单 agent 结论差异
- [ ] 把 `project-release` 的写法抽象成可复用模板

---

## 选题状态

按素材成熟度排序。10-13 素材已齐备，不依赖任何新进展，可以立刻动笔——这也是解决 7 月停更最快的路径。

| # | 选题 | 线 | 素材来源 | 状态 |
| --- | --- | --- | --- | --- |
| 10 | AI 写业务代码，我写约束 | C | 识字园 `AGENTS.md` 逐条讲 | ✅ 已排期 2026-08-18 |
| 11 | 多 Agent 评审推翻了我的产品决策 | B/C | `multi-agent-review-2026-07-20.md` | 可动笔 |
| 12 | 给 AI 划红线：儿童教育内容哪些不能让模型生成 | B/C | `learning-quality-gates.md` | 可动笔 |
| 13 | 一个 Agent 翻译了 25 篇 Angular 文章 | A/C | 本仓库 `blog-translator.agent.md` | ✅ 2026-08-15 |
| 14 | AI 全程开发的项目，我不了解它，怎么办 | B | B1 的完整过程 | 待 B1 |
| 15 | 我的 AI 开发环境：多模型切换与 Skill 实践 | C | 见 [ai-workflow-practice.md](./ai-workflow-practice.md) | 待整理 |
| 16 | 儿童识字产品的跨天保持实验 | B | B2 结果 | 待 B2 |
| 17 | Cloudflare Worker + D1 全栈实践 | B | 识字园架构 | 随 B 进展 |
| 18 | Angular 月度跟踪（系列） | A | A 的 log | 待首月 |

选题 11 最有差异化：单次审计原本建议做「语境补字」，产品 / 识字教学 / 儿童 UX 三角色复审后降级为不计分 shadow probe，理由是「太 _」这样的题面有多个正确答案。有过程、有反转、有结论，中文圈基本没人写这个粒度。

## 进度日志

<!-- 每次推进追加一行，最新在下 -->

- 2026-07-26 — 建立本追踪文档。核对识字园实际状态，修正「待上线」误判；确认 A / B / C 三条线与预算。
- 2026-07-26 — 按重新梳理的三点重构：A 补「如何体现深入」，B 补落到项目里的动作，C 从零扩展为完整一节 + `ai-workflow-practice.md`。
- 2026-07-26 — C 线首个成果：`blog-publish-check` skill + `scripts/check-content.mjs`。顺带修掉 3 处 `pubDatetime` 格式 bug，并发现 3 项既有技术债（记在 `plan-2026-h2.md`）。执行顺序见 `plan-2026-h2.md`。
- 2026-08-15 — 选题 13 发布（修正 13/16/来源构成后上线）；选题 10 排期 2026-08-18，避免与 Hermes 文同日挤首页。
