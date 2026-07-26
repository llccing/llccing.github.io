# AI 环境与 Skill 实践

> 对应 [learning-tracker.md](./learning-tracker.md) 的 C 线。
> 结论：环境配置已经完成得不错，但它是一次性投入。下一步的增量在 Skill 与 Agent 工程。

## 现状盘点（2026-07-26 核对）

自我评估是「比较基础」，实际比这个高。已完成的部分：

### 环境层

- Claude Code、Codex（含 Cloud）、Grok、OpenClaw 自托管，多套并行
- 模型切换与第三方代理接入，成本控制上有过完整的踩坑经历（见 [one-month-with-openclaw](../src/content/blog/life/one-month-with-openclaw.md)）
- 全局 skill 11 个，但基本是 Cloudflare 官方提供的，非自己编写

### 项目约定层

识字园的 `AGENTS.md` 4KB，质量高于多数公司项目。关键在于它写的是**禁令**而不是提示词技巧：

- 不许重新引入 CloudBase
- 不许绕过 `src/stores/sync.ts`（pending 重放与 blocked 处理都在那里，绕过去就丢数据）
- 改 schema 必须同步 `worker/schema.sql` 与 `docs/deployment.md`
- 教学内容必须人工审核，AI 只能出草稿

blog 仓库的 `CLAUDE.md` 170 行，`.github/agents/blog-translator.agent.md` 4.8KB 支撑了 25 篇翻译产出。

### Skill 层

两个项目级 skill，都写得很克制：

| Skill | 解决什么 |
| --- | --- |
| `project-release` | 固化 Worker → D1 migration → Pages 的部署顺序，明确「不许从脏工作区部署」「review 通过不等于可以部署」 |
| `literacy-feature-review` | 产品变更前的强制评审入口，附 `learning-quality-gates.md` |

`project-release` 里那句「Do not infer a generic ship flow」是这两个 skill 的价值所在——它防的不是 AI 不会部署，而是 AI 用通用流程去猜一个有特定顺序约束的部署。

### Agent 层

三个只读评审 agent（`literacy-product-lead`、`literacy-learning-reviewer`、`child-ux-reviewer`），主 agent 独占写权限。用过一次正式评审，结果推翻了单次审计的结论。

## 差距在哪

环境配置配好就不再增值，所以「感觉基础」是准确的判断。真正的能力阶梯：

| 层次 | 现状 | 增量空间 |
| --- | --- | --- |
| 环境配置 | ✅ 完成 | 无，一次性投入 |
| 项目约定 | ✅ 完成，质量高 | 小，维护即可 |
| Skill 工程 | 🟡 2 个 | 大 |
| 多 Agent 协作 | 🟡 3 个 agent，1 次实战 | 大 |
| 可复用方法论 | ❌ 未开始 | 最大 |

## 下一步：三件事

### 1. 安全整改（优先）

`~/.claude/settings.json` 里 `ANTHROPIC_AUTH_TOKEN` 是明文，base URL 指向第三方代理。风险不在于用代理，而在于：

- 明文 token 会被任何读取该文件的 AI 会话看到
- 容易在同步配置或截图时泄露

改法：token 从环境变量注入，配置文件里不留值。已暴露的 key 建议轮换。

- [ ] token 改为环境变量注入
- [ ] 轮换已暴露的 key

### 2. 给 blog 仓库写第一个自己的 skill

现在 11 个全局 skill 都是别人写的，自己写的两个都在识字园。blog 仓库有明确的重复流程可以固化：

**候选 A：发布前检查**。`pnpm lint` + `format:check` + `build`，加上本仓库特有的检查——frontmatter 必填字段、slug 与文件名一致、翻译文章必须有 `isTranslation: true` 与 `src/content/originals/` 对应文件。

**候选 B：Angular 月度文章生成**。从 `angular-weekly-log.md` 读当月 log，产出草稿。但要限制：只允许基于 log 里已记录的事实，不许自行补充 Angular 特性描述——这类内容 AI 容易编。

建议先做 A，规则明确、验收容易。B 涉及内容准确性，风险更高。

- [ ] 写 `.github/agents/` 或 `.claude/skills/` 下第一个自写 skill
- [ ] 用它跑一次真实发布，记录哪条规则 AI 没遵守

### 3. 再跑一次多 Agent 评审并对比

上次评审的价值是**结论被推翻**：单次审计建议做「语境补字」，三角色复审后降级为不计分 shadow probe，理由是「太 _」这样的题面有多个正确答案（大、小、好都能填）。

这个模式值得再验证一次，对象选 B2 的跨天保持实验设计。如果多 agent 又发现了单 agent 漏掉的问题，那就说明这套方法可复用，可以抽象成模板。

- [ ] 对 B2 实验设计跑一次多 agent 评审
- [ ] 对比单 agent 结论，记录差异
- [ ] 若模式成立，把 `project-release` 与评审流程抽象成跨项目模板

## 写作角度

选题 15「我的 AI 开发环境：多模型切换与 Skill 实践」。但要避开一个坑：**纯环境配置教程的生命周期很短**，写完半年就过时，而且这类内容满地都是。

有价值的写法是把配置当背景，重点写判断：

- 为什么 skill 里要写「不许从脏工作区部署」——因为 AI 会认为 review 通过就等于可以发布
- 为什么禁令比提示词技巧有效——约束是不变量，技巧是一次性的
- 多 agent 评审在什么情况下值得（有真实的推翻案例）、什么情况下是浪费
- 多套环境并行的真实成本，接 `one-month-with-openclaw` 的账继续算

一句话原则：**写「我为什么这么配」，不写「怎么配」。**
