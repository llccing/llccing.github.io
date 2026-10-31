---
pubDatetime: 2026-10-31T20:00:00+08:00
title: AI 写代码，我守住外循环
slug: ai-writes-code-i-own-the-outer-loop
featured: false
draft: false
tags:
  - ai
  - workflow
  - code-review
description: AI 能写的代码越来越多，人的判断该放在哪里？这篇从 Addy Osmani 在 AI Engineer 2026 的闭幕 keynote 出发，拆开「内循环 / 外循环」的分工边界、三个隐藏成本，以及 Claude Code 团队用六层流程把回滚率降下来的具体做法，最后给出一份我自己能跑的审核清单。附反面证据。
---

我最近一直在想一个问题：当 AI 能写的代码越来越多的时候，人到底还剩什么。

不是那种宏大的「AI 会不会取代程序员」——那个问题问法本身就有毛病。真正每天困扰我的是一件具体的事：**一段 AI 写的、几千行的改动摆在我面前，我该怎么判断它能不能合并？**

一行行看，看不过来。不看，又不敢发。说「只审重要的部分」，可问题恰恰出在——你并不知道哪部分重要。

这个问题我找了一圈资料，最后有两组一手来源给了我答案，而且它们指向同一个结论。一组是 Addy Osmani 在 AI Engineer World's Fair 2026 的闭幕 keynote（[视频](https://www.youtube.com/watch?v=n97BCfyFIvw)，18:26；[书面版 _Own the Outer Loop_](https://addyosmani.com/blog/own-the-outer-loop/)）；另一组是 Anthropic 工程团队的文章 [How the Claude Code team does code review](https://claude.dev/blog/solving-code-review-at-anthropic/)。

这篇是它们的合订本，加上我自己落地时的取舍。

## 先立三个词

Addy 的开场没有谈架构，先定义了三个词。这三个词是整个框架的基石：

- **Quality**：我们在放系统出去之前装好的所有检查。这些检查产出**证据**。
- **Verdict**：在东西进入我们的依赖系统之前，人做的那个**生产决策**——放行、拦截、重定向、收窄响应、加护栏，还是直接拒绝。
- **Answerability**：**有人问起的时候，我能解释为什么。**

三者的关系，他一句话讲完了：

> Quality produces evidence; a verdict assigns responsibility.

**质量产出证据，裁定分配责任。而可解释性，让你站得住你做的那个裁定。**

这里有个很容易滑过去的细节：verdict 不是"看一眼 AI 的输出"，而是"有人为这个决定负责"。他说得很直白——把人留在环里，意思是**保留那份责任**，而不是安排一个人去看一眼输出。

## 内循环与外循环

整个工作被切成两个环：

```text
内循环 · capability        外循环 · agency
─────────────────          ─────────────────
Investigate                Decide
Implement        ──────▶   Verify
Test           evidence    Approve
Report                     Own

智能体在跑                   人守住
```

内循环是 capability（能力）：调查、实现、测试、报告。这一环 agent 能跑得越来越多、越来越快。

外循环是 agency（能动性）：决定、验证、批准、拥有。这一环仍然是工程。

而两个环的交界处，agent 交出来的不是代码，是一个**证据包**——diffs、tests、logs、rationale、traces、trajectories、screenshots，看任务本身需要什么。然后工程才真正开始：这件事值不值得做？证据够不够？放行还是打回？

他还专门澄清了这条边界的位置：

> The boundary is not human looks at AI output. The boundary is evidence and responsibility.

**边界不是「人看过 AI 的输出」，而是证据与责任。**

这句话是我整场演讲里最有收获的一句。它把「审核」从一种阅读行为，重新定义成了一种责任行为。你不需要读每一行，但你需要能解释它。

## 三个隐藏成本

后半段他讲了三件必须避免的事。这三个概念我觉得是这场演讲最独特的贡献——它们描述的是**没有立刻报错、但会慢慢吃掉你的东西**。

### 认知负债（cognitive debt）

**理解力和记忆力的流失**，因为你把越来越多的问题解决外包给了 AI。

放在代码仓库里，它是这么度量的：**仓库里有多少代码** 和 **团队里有多少人真正理解这些代码** 之间的差距。

这句话戳人：

> A build can pass its tests and a PR can be ready to merge while the team loses its ability to explain the system it is shipping.

**构建可以通过测试，PR 可以合并，但团队同时正在失去解释自己正在上线的系统的能力。**

**通过检查**和**保留理解**是两种不同的属性。它们经常不同步，而且不同步的时候没有任何告警。

这个问题的严重程度还取决于**委托深度**（delegation depth）。他给了组数据：按人类等效工作时长算，30 分钟量级的任务成功率约 80.6%，1 小时量级约 70.2%，8 小时量级掉到约 25.6%。

委托深度变了，审核的性质就变了。三十秒的 agent 运行，感觉像一次交互；运行一小时甚至一整天的任务，那是一条**工作流**。当任务能跑那么久，尤其你还并行跑好几条的时候，审核不能再是「最后瞄一眼结果」。

> It has to become a whole control system.

它必须变成一整套控制系统。

### 认知投降（cognitive surrender）

这比认知负债更进一步。负债是慢慢失去熟悉度，投降是**在你自己形成判断之前，就先接受了 AI 的答案**。

他做了个很干净的区分：

- **委托（delegation）** 说的是——"去做，然后给我足够的证据让我能判断。"
- **投降（surrender）** 说的是——"你的答案就是我的答案，在我形成任何看法之前。"

委托里你仍然在做判断。投降里你跳过了那一步。

他引了 Wharton 的研究当警示灯：**当 AI 给了错误答案时，73.2% 的被试仍然跟着选了错的那个，而且比之前更自信。**

失败模式不是"用了 AI"，是**借来的信心**（borrowed confidence）。信心不能替代关于正确性的证据——这条在审核场景里尤其致命，因为"看起来很确定"恰恰是最有说服力的一种噪音。

### 编排税（orchestration tax）

> More AI agents running does not mean that there is more of you available.

**跑更多 AI agent，不等于有更多你可用。**

你的认知带宽不能并行。每多开一条循环，就意味着多出一批要路由、要合并、要验证、要集成的决策。

而且他特意说了，**解法不一定是少跑几个 agent**——而是**把注意力当系统来设计**：你从哪里进入、在那里获取什么、什么可以复用。并行执行只有在产生的决策仍然可控时才算帮上忙。

## 现实困境：不信任，但没带宽

有一组数据把当前的尴尬状态描述得很准确。

Sonar 的 2026 年调研：约 **96%** 的人并不完全信任 AI 产出的代码。但只有大约**一半**的人会在提交前总是验证。

他给这个状态起了个名字：

> Distrust without bandwidth.

**有戒心，但没带宽。**

工程师不傻。问题从来不是"大家太信任 AI 了"，而是"验证太贵了，贵到大家会下意识跳过"。所以安全的来源不是教育大家要谨慎，而是——

> Safety comes from making verification cheaper, clearer, and harder for people to skip.

**让验证更便宜、更清晰、更难被跳过。**

这一条其实可以直接拿来当工程目标：你引入的每一条检查，是在降低验证成本，还是在增加仪式感？

## 顺带一提：干净代码现在有双重收益

以前我们说要写干净的代码，理由永远是"下一个读它的人"。现在多了一条：

Sonar 的研究 [Does Code Cleanliness Affect Coding Agents?](https://arxiv.org/abs/2605.20049) 用 Claude Code 跑了受控对比，发现干净仓库和脏乱仓库的**任务通过率大致相同**，但干净仓库少消耗约 **7–8% 的 token**，文件重访次数少约 **34%**。

结论不是"脏代码会让 agent 失败"，而是——**agent 能达到相同结果，但要花更多力气反复读、反复回头看**。

可维护性第一次可以直接换算成 agent 的运行成本。这条对个人项目也成立：你为可读性花的每一分钟，agent 会在后续几十次任务里还给你。

## Claude Code 团队怎么落地

上面是"为什么"，这一节是"怎么做"。Claude Code 自身约 90% 的代码由 AI 编写，他们的做法是一套六层结构：

| 层                | 做什么                                    | 归谁   |
| ----------------- | ----------------------------------------- | ------ |
| ① PR 前内部 skill | 找 bug、简化 diff、端到端验证行为         | agent  |
| ② CI              | Lint、类型检查、多平台测试、构建          | 机器   |
| ③ AI 审核         | 多 agent 并行找问题，另一批 agent 投票    | agent  |
| ④ 安全审核        | 独立一轮，专查安全问题                    | agent  |
| ⑤ 按风险人工审批  | 按风险档决定几人批准                      | **人** |
| ⑥ 合并后          | 功能开关 → 内部 → latest → stable，备回滚 | **人** |

几个我认为真正关键、并且可以直接抄的点：

**① 用全新上下文的 agent 去审，不要复用写代码那个。**
写代码的 agent 上下文里存着它先前的推理，回头检查会顺着原思路走，以为自己写对了。新建一个 agent，只给它目标和 diff。它不知道实现过程——**这个看似是缺陷的东西，恰恰保证了客观。**

**② 多 agent 投票，风格类发现直接丢弃。**
多个 agent 并行找 bug，另一批 agent 对每个发现投票，够数才发出来。而且**这套过滤是在他们自己的 PR 上 A/B 测过的**，不是拍脑袋定的阈值。

**③ 只考核命中率会让 AI 拼命多报。**
这是最容易踩的坑。你优化"发现问题数"，AI 会用大量垃圾意见刷分。所以要同时测**无效率**——按作者反馈分四类（改了 / 说它错了 / 说故意的 / 无所谓），后三类算无效；或者拿确认无问题的 PR 去测，报出来的基本都是废话。

**④ 收敛规则必须写死。**
有实测案例：一个 PR 一晚上来回改了 50 多轮。他们后来做了 `git blame`，发现**约 59% 被反复标记的代码，是第一轮审核时就已存在的**——每轮只是在多翻出几个老 bug，不是发现新问题。

四条规则：超过 3 轮就停下来反思整体思路；几轮之后**只看新增改动行**；同类问题一次全指出；不重复提已提过的。采用后一轮通过率从 **65% 提升到 78%**。

**⑤ "已有问题"必须是独立分类。**
这一条看着不起眼，实操中是 PR 卡住和团队摩擦的最大来源。不区分的话，AI 会把历史债务算到当前 PR 头上，作者会觉得"又不是我改的凭什么让我改"。

## 反面证据，必须一起看

如果只看上面的内容，很容易得出"AI 让我们更快更好"的结论。但有几组反向数据必须摆在一起：

- **METR 随机对照试验**（[arXiv:2507.09089](https://arxiv.org/abs/2507.09089)）：16 名资深开源开发者、246 个真实任务，用 AI 组**平均慢 19%**（置信区间 2%–39%）。但他们事前预计快 24%，事后**仍然自认快了 20%**。
- **GitClear**：每天用 AI 的开发者产出约 4 倍代码，对照自己上一年，真实增益只有约 12%，且部分来自选择偏差。
- **CodeRabbit**（470 个开源 PR）：AI 协同改动的问题数约为人工的 **1.7 倍**，其中可读性问题超过 **3 倍**。

**体感加速 ≠ 实际加速。**

这组数据比任何正面数据都重要，因为它解释了一件很反直觉的事：为什么「AI 让我更快」这个判断经常不可靠。METR 那 19% 的差距，配上"事后仍自认快了 20%"，说明我们对自己的速度估计本身就已经被污染了。

另外提醒一句：CodeRabbit 和 Faros AI 本身都在卖同类产品，他们的调研存在供应商偏差。正面数据大多来自 Anthropic 单方口径，也没有说明统计口径、样本量和时间窗口。看的时候心里留个数。

## 我把它做成了什么

研究完这些，我把其中性价比最高的部分固化成了一个可复用的 skill。设计上有几条是刻意的：

**审核必须在全新上下文里跑。** 这是整个设计的地基。用子 agent 执行，只喂"目标 + diff 文件绝对路径"，不带上一段会话里关于「我为什么这么写」的解释——那正是需要屏蔽的偏见来源。

**没有目标就不审。** 目标来源优先级：用户说明 > PR 描述 > 提交信息。三者都没有就先问，不靠 diff 猜。猜出来的目标会让整个审核建立在错误前提上。

**输出必须是证据，不是意见。** 没有证据支撑的问题不允许输出，也不允许口述"应该没问题"。

**审核者不拿到写权限。** 避免"边审边改"把上下文重新污染。

**四条收敛规则硬编码**，不是建议。

**每条意见必须给出处置**：要么改，要么写明理由关掉。有一条未处理就判不可合并。

这套东西和我在 [《AI 写业务代码，我写约束》](/posts/ai-writes-code-i-write-constraints/) 里做的是同一件事的两面：那份 `AGENTS.md` 管的是**入口**——AI 动手之前不许做什么；这个 skill 管的是**出口**——AI 交活之后人怎么验收。约束写在前面，审核跑在后面，中间那一段才是自动化的空间。

## 解释不了，就别发

演讲最后给了条操作规则，我觉得可以贴在显示器上：

> Explain it or don't ship it.

**解释不了，就别发。**

它不是要求人敲每一行、甚至读每一行——它要求**有人理解这份工作到足以替它辩护**。

在大代码库里有个熟悉的类比：某些目录有 owner，那部分系统出问题了有人 on the hook。Agent 写的代码同样需要这层关系。发布之前，那些 owner 必须能解释改了什么、能指出支撑证据、能说清自己在接受什么风险。

结语的三句话我挺喜欢：

> Build the factories, keep the lights on, own the verdict.

**建工厂，保持运转，拥有裁定权。**

还有那个历史类比值得记一下——每一次我们让写软件变得更容易（高级语言、框架、云、低代码），都有人预言世界不需要那么多软件了，结果每次都相反。成本降下来，被压抑的需求就冒出来了。**瓶颈从"我们能不能做出来"，移到了"这东西该不该存在，以及有人能为此负责吗"。**

所以回到开头那个问题：一段几千行的 AI 改动摆在我面前，我该怎么判断它能不能合并？

我的答案变了。不再是"我要不要读完它"，而是——**我能不能解释它，以及我愿不愿意为它负责。**

---

### 一手来源

- [The engineer of the future is the person who is able to choose what is worth doing](https://www.youtube.com/watch?v=n97BCfyFIvw) — Addy Osmani，AI Engineer World's Fair 2026 闭幕 keynote，18:26
- [Own the Outer Loop](https://addyosmani.com/blog/own-the-outer-loop/) — 上面那场的书面版
- [How the Claude Code team does code review](https://claude.dev/blog/solving-code-review-at-anthropic/) — Anthropic Engineering
- [Agentic Code Review](https://addyosmani.com/blog/agentic-code-review) — 同一作者，更偏「人如何配合」
- [Agentic Code Quality](https://addyosmani.com/blog/agentic-code-quality) — 约束与质量门禁
- [Human judgment doesn't leave the software factory. It relocates.](https://addyosmani.com/blog/human-judgment-doesnt-leave-the-software/) — 内外循环的详细展开
- [The New Software Lifecycle](https://addyosmani.com/blog/new-sdlc-vibe-coding) — 生命周期各阶段被压缩得不均匀
- [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/abs/2507.09089) — METR 随机对照试验
- [Does Code Cleanliness Affect Coding Agents?](https://arxiv.org/abs/2605.20049) — Sonar
