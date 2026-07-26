---
pubDatetime: 2026-07-26T21:30:00+08:00
title: AI 写业务代码，我写约束
slug: ai-writes-code-i-write-constraints
featured: false
draft: true
tags:
  - ai
  - workflow
  - architecture
description: 一个上线中的儿童识字应用，代码几乎全是 AI 写的。我在里面投入最多的不是代码，是一份 4KB 的约束文件。这篇讲那几条禁令分别防住了什么——每一条背后都是一段真实会丢数据的代码路径。
---

我有一个上线中的个人项目，儿童识字应用，给我女儿用的。Vue 3 + Cloudflare Worker + D1，约 8600 行代码，几乎全部由 AI 写成。

在这个项目上我投入最多精力的文件不是任何一段业务代码，是根目录下 4KB 的 `AGENTS.md`。

它里面没有一条提示词技巧，全是禁令。

## 提示词技巧是一次性的，约束是不变量

刚开始用 AI 写代码时，我也研究过怎么把需求描述得更精确。「请用 TypeScript 实现」「注意错误处理」「遵循项目现有风格」——这类话每次都要重说一遍，而且下一个会话它就忘了。

后来我发现真正有效的是另一种东西：**写清楚什么不许做，并说明为什么。**

区别在于，技巧作用于单次对话，约束作用于整个项目。技巧要靠你每次记得说，约束写进文件之后，每个新会话读一遍就生效。

更重要的是：技巧防不住 AI 的合理选择。AI 写出来的代码经常是**局部正确、全局错误**——它选了一条最直接的实现路径，而那条路径恰好绕过了你精心设计的某个机制。它不知道那个机制存在，因为它只看到了眼前这个函数。

下面是我那份文件里的几条，每一条都对应一段真实的代码路径。

## 禁令一：不许绕过 sync.ts

```
Do not bypass src/stores/sync.ts for cloud-backed mutations.
Pending replay and blocked-state handling live there.
```

这条看起来像代码洁癖——为什么非要走那个 store？直接调 API 不行吗？

不行。`sync.ts` 有 541 行，里面是一个状态机，处理离线场景。

用户在地铁上给孩子添了几个生字，此时没网。这些操作先进本地 pending 队列。等网络恢复，队列重放。关键在 `replayPendingMutations` 这个函数里：

```ts
try {
  await replayMutation(mutation);
  removePendingMutation(mutation.id, mutation.type);
} catch (error: any) {
  const message = error?.message ?? "同步失败";

  if (cloud.shouldFallbackToLocal(error)) {
    updatePendingMutation(mutation.id, mutation.type, "pending", message);
  } else {
    updatePendingMutation(mutation.id, mutation.type, "blocked", message);
  }

  lastError.value = message;
  return false;
}
```

注意那个 `if`。失败被分成了两类：

- **网络类失败** → 保持 `pending`，下次继续重试
- **服务端拒绝** → 标记 `blocked`，**整个队列停下**

第二种是重点。函数开头还有一段：

```ts
if (hasBlockedMutations.value) {
  lastError.value = `有 ${blockedCount.value} 项本地修改需要重新处理`;
  return false;
}
```

一个 blocked 的操作会把它后面所有排队的操作全部冻住。这是故意的——如果第一条写入被服务端拒绝了，后面的操作很可能建立在错误的前提上，继续重放只会让数据更乱。

现在回头看那条禁令。如果 AI 图省事，在某个组件里直接 `fetch` 了 Worker 接口，会发生什么？

那次写入不进队列。离线时它直接失败，用户以为存上了，其实没有。就算在线成功了，它也绕过了失败分类——没有 pending 重试，没有 blocked 熔断。

**这不是风格问题，是丢数据。**

而 AI 完全可能做出这个选择，因为从单个组件的视角看，直接调 API 是最短路径。它看不到那 541 行里的状态机。

## 禁令二：Worker 是唯一权威写入路径

```
Treat the Worker as the only authoritative write path. If a feature changes
word creation, deletion, review submission, or watering, update the Worker
contract and the frontend sync flow together.
```

这条和上一条是配套的。前端有本地快照，用来支撑离线体验，但**本地快照没有裁决权**。

具体到实现，Worker 端强制要求幂等标识：

```ts
if (!body.requestId) {
  throw new HttpError(400, "requestId is required");
}
```

以及生成 ID 的方式：

```ts
function makeWordId(
  familyId: string,
  text: string,
  requestId: string,
  index: number
): string {
  return `${familyId}_${requestId}_${index}_${text}`;
}
```

ID 是从 `requestId` 推导出来的，不是随机生成的。这意味着同一个 `requestId` 重放多少次，写进去的都是同一行，不会产生重复数据。

这两条合起来才完整：前端的 pending 队列负责在断网重连时**带着原来的 `requestId` 重放**，Worker 负责**认这个 ID 并保证幂等**。少任何一半，重放都会变成重复写入。

这也是为什么禁令里那句「必须同时更新 Worker 合约和前端同步流程」不是废话——它们是一个机制的两端。

这条有测试兜底，`worker/src/index.test.ts` 里有一个用例叫「derives rewards server-side and makes a repeated review request idempotent」。**约束写在文档里，验证放在测试里，两者都有才算数。**

## 禁令三：不许重新引入 CloudBase

```
Do not reintroduce CloudBase. The current backend boundary is the Worker
HTTP API in src/services/cloud.ts.
```

这条看起来最奇怪。为什么要禁止一个已经不用的东西？

因为项目早期用过 CloudBase，后来迁到了 Cloudflare Worker。迁移完成了，但 `docs/` 下还留着旧的技术方案文档，里面全是 CloudBase 时代的设计。

AI 读文档时不知道哪份是过期的。它看到一份写得挺完整的架构文档，很自然就照着写了。

所以这条禁令真正防的不是 CloudBase 本身，是**过期文档的污染**。同样的道理我还写了一条：

```
Treat docs/magic-literacy-garden-vue3-tech-spec.md as historical planning
context only. It still contains old CloudBase-era design notes.
```

这是个容易被忽略的问题：项目越老，文档里的历史沉淀越多，而 AI 没有能力判断哪些已经作废。人类靠的是「我记得那个是老方案」，AI 没有这个记忆。

**你得明确告诉它哪些文件是历史，不是现状。**

## 禁令四：教学内容必须人工审核

```
Treat Chinese character, pronunciation, example-word, semantic, and
stroke-order content as educational content requiring explicit review.
Never silently invent authoritative curriculum data.
```

前三条防的是数据和架构，这条防的是**内容**。

这是个儿童识字应用。如果 AI 生成了一个错误的拼音、一个错误的笔顺、一个不恰当的例词，我女儿就会学错。而且这种错误极难发现——它看起来完全合理。

代码写错了会报错，会有测试挂掉。内容写错了没有任何信号。

所以这条禁令的措辞比其他几条都重：`Never silently invent`。AI 可以生成候选内容，但必须标记为待审核草稿，不能直接写进权威数据。

我在产品 backlog 里也贯彻了这一点。有一项叫「AI 家长内容辅助」，写着：

```
Generate candidate examples/hints only; never write authoritative
curriculum automatically
```

**这是我认为 AI 协作里最该划的一条线：区分「可以出错的地方」和「不能出错的地方」，然后在后者上明确禁止自动化。**

## 这些禁令为什么有效

回头看这四条，共同点是：**它们都不是在描述「应该怎么写代码」，而是在描述「这个系统的哪些前提不能被破坏」。**

AI 很擅长在给定约束下找到实现路径。它不擅长的是猜出那些没写下来的约束。而一个真实项目里，最重要的约束往往恰恰是没写在代码里的——它们在设计者脑子里。

`sync.ts` 那 541 行代码本身不会告诉任何人「不许绕过我」。这句话必须由人写下来。

所以我现在的分工是这样的：

- **AI 写实现**：组件、样式、样板代码、测试用例
- **我写约束**：哪些机制不能绕、哪些数据不能自动生成、哪些文档是过期的

按代码量算，我写的那部分只有 4KB，项目有 8600 行。但如果没有这 4KB，那 8600 行会在某次「合理的重构」里悄悄坏掉。

## 一个还没解决的问题

写这篇的时候我意识到一件事：约束文件保护了系统，但没有保护我自己。

这个项目跑了几个月，工程完备度不低——有 feature flag、有回滚阈值、有埋点字典、有 80 个测试。但如果你现在问我 `sync.ts` 里 blocked 状态的完整流转，我需要打开文件才能回答。

代码是我的，理解不完全是。

这是 AI 辅助开发的一个副作用，而且我觉得它比「AI 写的代码有 bug」严重得多。bug 能修，理解的缺失会在你需要救火的时候才暴露。

这个问题我还没解决，打算专门写一篇。禁令能防住 AI 破坏系统，防不住我自己变成系统的陌生人。
