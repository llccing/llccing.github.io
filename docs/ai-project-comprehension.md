# 重新理解一个 AI 全程开发的项目

> 对象：Magic Literacy Garden（`~/projects/julianna-booking`），已上线 `words.xindamate.com`
> 问题：项目全程由 AI 开发，工程完备度很高，但作者对它缺乏「自己写出来的那种理解」。

## 先明确：这不是文档问题

项目里已经有 10 份文档：`architecture.md`、`domain.md`、`api.md`、`deployment.md`、`testing.md`、`metrics.md`、`rollout.md`、`design-system.md`，加 `docs/product/` 下 4 份产品文档。`AGENTS.md` 4KB，约定写得比多数公司项目严格。

**再加文档不会解决这个问题。** 文档是别人（这里是 AI）理解的产物，读文档得到的是「知道」，不是「理解」。理解只能通过自己重建心智模型产生。

两者的区别有个简单的判据：

- 知道：能说出「复习结果通过 sync store 提交到 Worker」。
- 理解：断网时点提交，你能预测发生什么；线上出现 `correctCount + wrongCount !== wordIds.length` 时，你知道先查哪个文件。

目标是后者。

## 规模是可控的

先把恐惧量化掉。总量约 8600 行，其中：

| 层 | 源码行数 | 说明 |
| --- | --- | --- |
| `src/domain/` | 745 | **全部业务规则在这里**，纯函数，每个文件都有配套测试 |
| `src/stores/` | 1481 | 状态编排，其中 `sync.ts` 541 行是最复杂的地方 |
| `src/services/` | 562 | 外部边界（Worker HTTP、TTS、埋点、feature flag） |
| `src/repositories/` | 142 | 本地快照 + pending 队列 |
| `worker/src/index.ts` | 2384 | 后端全部路由 |
| `src/pages/` + `components/` | 4198 | UI，**可以最后再看** |

真正决定这个产品行为的是 `domain/` 那 745 行。这个量一个晚上能读完。

## 方法：四件事，按顺序做

### 1. 用测试当规格来读领域层

`src/domain/` 下每个文件都有 `.test.ts`。测试是 AI 写的，但它是**可执行的规格**——比文档可靠，因为它跑得起来。

读法：先读 `mastery.test.ts`，再读 `mastery.ts`。测试告诉你「这个函数应该满足什么」，源码告诉你「它怎么做到的」。带着前者去看后者，比直接看源码快得多。

建议顺序（按依赖关系，从内到外）：

1. `mastery.ts`（51 行）— 掌握度怎么算。这是整个产品的核心判断。
2. `rewards.ts`（16 行）— 水滴奖励。最简单，热身用。
3. `scheduling.ts`（113 行）— 间隔调度 + `generateOptions`。审计里 P1 的干扰项问题就在这个函数。
4. `review.ts`（57 行）— 复习流程规则。
5. `dailyPlan.ts`（111 行）— 每日计划生成。
6. `garden.ts`（70 行）— 花园成长。
7. `learning.ts`（79 行）— 学习内容，含未收录字的 fallback（审计 P1 第 3 条）。
8. `reporting.ts`（80 行）— 家长报告聚合（审计 P1 第 4 条）。
9. `words.ts`、`speech.ts`、`feedback.ts` — 支撑逻辑。

读完这 9 个文件，你就掌握了这个产品的全部业务规则。

### 2. 主动破坏，验证理解

这一步是把「知道」变成「理解」的关键，也是最省时间的一步。

做法：改一行领域代码，**先预测**哪些测试会失败、失败信息是什么，再跑 `npm test` 对答案。

```bash
# 例：把 mastery.ts 里的升级阈值改掉，预测后跑
npm test
```

预测对了，说明模型建立了。预测错了，那个差异就是你理解的缺口所在——这比读十遍文档有效。改完 `git checkout` 还原。

值得试的几处：

- `mastery.ts` 的升级/降级条件
- `rewards.ts` 的水滴计算
- `scheduling.ts` 的 `nextReviewAt` 间隔
- `generateOptions` 的干扰项数量

### 3. 追一条完整链路

选一个动作，从点击追到数据库，把每一跳的文件和函数名写下来。推荐「提交一次复习」，因为它穿过了所有层，而且涉及项目最难的部分（幂等 + pending 重放）。

```
点击提交
  → src/pages/  哪个页面？
  → src/stores/review.ts  怎么结算的？
  → src/domain/  调了哪几个纯函数？
  → src/stores/sync.ts  怎么排队、怎么处理 blocked 状态？
  → src/services/cloud.ts  Zod 怎么校验？
  → worker/src/index.ts  哪个路由？幂等怎么保证？
  → worker/schema.sql  写了哪几张表？
```

追完这一条，`AGENTS.md` 里那几条禁令会突然变得很好懂——「不许绕过 sync.ts」是因为 pending 重放和 blocked 处理都在那里，绕过去就丢数据。

第二条建议追「离线时添加一个字，恢复网络后发生什么」，这条能打通本地快照 + pending 队列的设计。

### 4. 不用 AI 修一个真 bug

最后一步。挑一个自己能复现的小问题，**全程不问 AI**，自己定位、自己改、自己验证。

用哪个都行，`docs/product/opportunity-backlog.md` 里 P1「复习进度超过 100%」已实现待发布，可以拿它的实现反过来验证：如果这个 bug 让你修，你能不能找到位置？

这一步的价值是校准：你能独立修的部分，就是你真正掌握的部分。

## 建立防回归的习惯

理解会随着 AI 继续开发而再次流失。三个低成本的习惯：

1. **文档自己写一遍**。不是新增文档，而是把 `domain.md` 用自己的话重写。写不出来的段落就是没懂的地方。写完和原版对比。
2. **AI 改领域层，必须自己 review**。UI 和样板代码可以放手，但 `src/domain/` 和 `worker/src/index.ts` 的改动要逐行看。这是 745 + 2384 行的核心资产，让它变成黑箱就等于放弃了项目所有权。
3. **每次 AI 提交后，一句话记下改了什么规则**。不是 commit message，是「这次改动改变了哪条业务规则」。

## 时间预算

| 步骤 | 预估 | 产出 |
| --- | --- | --- |
| 1. 读领域层 + 测试 | 2-3 h | 掌握全部业务规则 |
| 2. 破坏性验证 | 1 h | 确认模型正确 |
| 3. 追两条链路 | 1-2 h | 打通分层与同步模型 |
| 4. 独立修一个 bug | 1-2 h | 校准真实掌握度 |

合计 5-8 小时，可以拆成两三个周末。做完之后，这个项目就从「AI 的项目」变成「我的项目」了。

## 这本身就是选题

「AI 全程开发的项目，我不了解它，怎么办」——这个问题现在几乎没人认真写。满地都是「我用 AI 一天做了个 App」，没人写第二个月怎么办。

参考已有的 [one-month-with-openclaw](../src/content/blog/life/one-month-with-openclaw.md)：那篇之所以是 AI 类文章里最好的一篇，就是因为写了真实的失败和真实的数字。这篇同理——带上「我预测错了哪几个测试」这种具体的东西，价值远超任何一篇「AI 提效技巧」。

建议写法：先做完上面 4 步，边做边记，做完再写。不要先写。
