---
pubDatetime: 2026-08-02T00:00:00+08:00
title: "每天 90 亿次请求如何搬家：深入理解 cdnjs 迁移到 Cloudflare Developer Platform"
slug: cdnjs-cloudflare-developer-platform-migration
featured: false
draft: false
tags:
  - cloudflare
  - cdn
  - architecture
  - fullstack
description: "从 cdnjs 的旧架构、五个痛点和一次失败回滚讲起，逐层理解 R2、Workers、Workflows、Queues、Durable Objects 与 Containers 如何共同承载每天 90 亿次请求。"
---

这篇文章来自我在 [2026 年 7 月 31 日技术简报](/digest/2026/07/31/) 里收录的一条消息：Cloudflare 把 cdnjs 完整迁移到了自己的 Developer Platform。

简报只能告诉我“发生了什么”，但这次迁移里真正有价值的部分，藏在系统边界、失败方式和迁移约束里。因此，我继续追问了几个问题：

> 这篇文章讲的是什么事情？Cloudflare 是如何处理的？涉及哪些技术？最后结果怎么样？能不能讲得细致一些，让我同时理解这件事和背后的原理？

下面不是原文翻译，而是围绕这些问题，对 [Cloudflare 原文](https://blog.cloudflare.com/cdnjs-dev-platform-migration/) 的一次拆解。

## 先说结论：这不是一次普通的 CDN 搬家

这次迁移不是把几台源站服务器从 GCP 搬到 Cloudflare，也不是为了让静态文件再快几毫秒。

Cloudflare 重建的是 cdnjs 从发现新版本、下载软件包、解包、压缩、计算完整性哈希、发布、存储、建立搜索索引，到全球分发的整条生产链路。

旧系统横跨 GCP Cloud Functions、Google Cloud Storage、Pub/Sub、VM、GitHub、Workers KV 和 Cloudflare 内部缓存。新系统则以 R2 为文件的唯一事实来源，以 Workflows 编排发布流程，以 Workers 提供访问，以 Queues 和 Durable Objects 协调并发，以 Containers 完成重计算，并使用 DigitalOcean Spaces 提供灾难恢复副本和在线回退。

文章标题里的 **dogfooding**，直译是“吃自己的狗粮”。在软件行业里，它指公司用自己的产品承载真实业务。cdnjs 每天处理约 90 亿次请求，因此这次 dogfooding 不是内部演示，而是让公开出售的开发者平台接受互联网级业务的检验。

## cdnjs 为什么今天仍然重要

[cdnjs](https://cdnjs.com/) 是免费的开源 JavaScript 和 CSS 公共 CDN。网页可以不安装依赖、不运行构建工具，直接引用一个固定版本：

```html
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"
  integrity="sha512-..."
  crossorigin="anonymous"
></script>
```

文章给出的规模是：cdnjs 被大约 12% 的网站使用，占 JavaScript CDN 市场的 48.3%；平均每秒处理约 108,000 个请求，每天约 90 亿个请求，覆盖 330 多个 Cloudflare 数据中心，缓存命中率为 98.6%。

按平均流量粗略估算，98.6% 命中意味着只有约 1.4% 的请求需要进入更深的读取链路，也就是每秒约 1,500 次。不过系统存在多层缓存，这个数字只能帮助理解数量级，不能直接当作 R2 的精确请求量。

现代 Web 已经有 ESM、Vite、Bun 和各种 bundler，为什么 `<script>` CDN 仍有这么大流量？原文给出了几个原因：

- 十五年来，大量教程、README、CodePen 示例和问答都引用了 cdnjs。
- ChatGPT、Claude、Cursor 等工具生成简单 HTML 时，也经常生成训练数据中反复出现的 cdnjs 地址。
- URL 结构稳定，固定版本对应不可变内容，不需要注册、API Key 或限流配额。
- 每个文件都带有 SRI 哈希，镜像可审计，项目本身也是开源的。

这说明“新工具出现”不等于旧基础设施会自然消失。一旦某种 URL 成为公开知识和长期依赖，它本身就构成了互联网兼容性的一部分。

## 旧架构：读取已经在 Cloudflare，发布仍留在 GCP

2020 年，Cloudflare 已经把 cdnjs 的文件分发迁移到 Workers 和 Workers KV，并保留裸机源站作为回退。这次改造提高了弹性和扩展能力，也让文件可以预先生成 Brotli 与 gzip 版本。

但发布端仍然留在 GCP。当时 Workers 适合短时间 HTTP 请求，还没有 Workflows、Queues、Durable Objects、R2 和 Containers 这些构建长流程所需的组件。

旧发布链路可以简化成：

```text
Cloud Scheduler
  -> Cloud Function 检查 npm / GitHub
  -> GCS incoming bucket
  -> Cloud Function 解包、校验、压缩
  -> GCS outgoing bucket
     -> 写入 Workers KV
     -> VM 同步到 GitHub
     -> 写入 R2 备份
     -> 更新 Algolia
```

这套架构并不慢，也没有频繁宕机。Cloudflare 明确说，迁移不是因为 cdnjs 性能差，而是因为继续修复发布问题、添加能力和排查故障越来越困难。

## 旧系统的五个痛点

### 1. 没有贯穿全链路的追踪标识

一个版本会经过 Cloud Functions、GCS 对象事件、Pub/Sub、git-sync VM 和 Workers KV。GCP 日志记录前半段，Cloudflare Logpush 记录后半段，两边没有共同的 correlation ID，也就是同一次处理任务的统一编号。

最危险的情况不是彻底失败，而是“部分成功”：文件已经写入 KV，可以对外服务，却没有进入 GitHub。用户可能几周都感觉不到问题，直到两个存储副本已经明显分叉。

### 2. 两个事实来源形成 split-brain

文件同时存在于 Workers KV 和 GitHub 仓库。流水线在末尾分别写入两边，但没有一个被定义为绝对权威。如果一次写入只成功了一半，系统无法自动判断应该相信谁，也很难自动修复。

### 3. 对象存储事件被当成消息队列

一个函数把文件写进 bucket，“新对象”事件触发下一个函数，下一个函数又写入另一个位置。对象存储因此同时承担了数据保存和任务调度。

这种方式缺少真正队列的能力：没有清晰的积压视图，没有规范的死信处理，失败步骤不容易重放，也很难回答“这个包现在进行到哪一步”。

### 4. 检查 npm 更新需要 26 个函数

旧系统按包名首字母分片，部署了 26 个 Cloud Functions。每个函数有独立的部署和日志。想知道整个检查任务是否健康，需要检查 26 处。

### 5. GitHub 仓库增长到 1.1 TB

`cdnjs/cdnjs` 仓库的 packed storage 超过 1.1 TB。GitHub 无法再为它生成 zip 或 tarball，fork 变得不现实，clone 很慢，`.gitignore` 也积累了 274 条针对异常发布的特殊规则。

根本问题是用 Git 仓库保存海量生成资产。Git 擅长审查源代码的版本关系，却不是为数百万个 CDN 对象设计的存储系统。

## 新架构的第一原则：每类数据只做它适合做的事

新系统的数据分工很清楚：

| 组件                | 保存或处理什么                              | 为什么适合                                          |
| ------------------- | ------------------------------------------- | --------------------------------------------------- |
| R2                  | JavaScript、CSS、source map、字体和压缩文件 | 对象存储适合按键读取大规模不可变文件，也提供 S3 API |
| KV                  | 包信息、版本列表、SRI 哈希                  | 元数据体积小、读取频繁、写入相对较少                |
| Workers Cache       | 热门文件缓存                                | 在进入 Worker 和存储读取前吸收绝大多数流量          |
| DigitalOcean Spaces | R2 的镜像                                   | 既是灾备副本，也是 R2 无法返回文件时的在线回退      |
| Algolia             | 包与版本的搜索索引                          | 负责搜索，不承担文件权威存储                        |

其中最重要的决定是：**R2 成为文件内容唯一的 source of truth**。KV 不再保存主要文件，GitHub 也不再和 KV 竞争“谁才是真相”。

典型读取路径可以理解为：

```text
浏览器
  -> Cloudflare 边缘缓存 / Workers Cache
  -> CDN Worker
  -> R2
  -> DigitalOcean Spaces 回退
```

热门资源通常在缓存层结束。缓存未命中时读取 R2；如果 R2 暂时无法返回文件，Worker 再尝试 DigitalOcean Spaces。

## Workflows 如何重建发布流水线

新系统每十分钟由 cron 启动一次 `PackageUpdatesWorkflow`：

1. 检查 npm 和 GitHub 是否出现新版本。
2. 为每个新版本启动 `DownloadPackageWorkflow`。
3. 下载 npm tarball，并先写入 R2。
4. 为包里的每个文件启动一个 `ProcessingWorkflow`。
5. 执行解包、最小化、压缩和 SRI 计算。
6. 等待所有文件完成。
7. 启动 `PublishingWorkflow`。
8. 把结果写入 R2、KV，并更新 Algolia。

Workflows 的关键不是“可以按顺序调用几个函数”，而是 **durable execution，持久化执行**。成功步骤的状态会被保存。遇到网络超时或压缩错误时，流程可以从最后一个成功步骤继续，而不是整包从头运行。

普通函数更像“执行一段代码”；Workflow 更像“执行一个有记忆、可暂停、可恢复的业务过程”。这也解决了旧架构最痛苦的观测问题：流程状态不再散落在 bucket 事件和多套日志里。

## Queues、Containers 与 Durable Objects 如何配合

### 每个文件：Workflow 休眠，Container 做重计算

每个 `ProcessingWorkflow` 把未压缩文件写入 R2，向 Queue 发送任务，然后暂停等待。运行 Rust 服务的 Container 从 Queue 取得任务，在内存里完成压缩，把结果写到另一个 R2 bucket。R2 事件通知再唤醒 Workflow。

之所以暂时使用 Container，是因为现有算法需要把整个库缓冲到内存中。大型包需要更长 CPU 时间和更多内存，不适合短时、轻量的 Worker。团队正在研究流式处理；如果可以边读边处理，这部分未来可能迁回 Worker。

Queues 提供的是 **at-least-once delivery，至少投递一次**。它降低任务静默丢失的风险，但并不承诺“恰好一次”。同一个任务可能重复到达，因此消费者必须具备幂等性：重复压缩、重复写入同一对象，不能把最终状态破坏掉。

### 每个包：Durable Object 等待所有子任务汇合

一个包可能有数千个文件，父 Workflow 会并行启动数千个子 Workflow，但只有所有文件都处理完成后才能发布。

Cloudflare 使用一个小型 Durable Object 作为计数器：父任务每启动一个子任务就加一，子任务完成时减一，计数器归零后父任务继续。

这是一种典型的 fan-out / fan-in：先把工作扇出到大量并行任务，再在一个同步点汇合。Durable Object 让同一份有状态数据在一个明确的协调位置按顺序更新，避免并发修改把计数器算错。

## 第一次迁移为什么必须回滚

Cloudflare 曾尝试重新处理所有历史包并写入 R2。生成出来的文件功能正确，却没有和 KV 中已经对外服务的文件逐字节一致。

原因是 minifier 和压缩器在不同版本、配置或运行环境下不一定生成相同字节。对普通程序来说，多一个空格可能没有影响；对使用 SRI 的公共 CDN 来说，这是破坏性变更。

SRI 的逻辑是：

```text
页面声明的哈希 = SHA-384(发布时的精确文件字节)
浏览器计算的哈希 = SHA-384(这次下载到的精确文件字节)

两者相同   -> 允许执行
两者不同   -> 拒绝执行
```

哪怕 JavaScript 语义完全相同，只要字节变化，哈希就变化。大量网站已经把旧哈希写死在 HTML 中。重新构建历史文件会让这些网站拒绝加载脚本。

因此 Cloudflare 回滚了第一次尝试，最终不再“重新推导历史”，而是把 KV 中已经对外服务的字节原样复制到 R2。

这里有一个很值得记住的迁移原则：

> 对外发布过的不可变资产，其字节内容本身就是公共 API。迁移时必须复制历史事实，不能用新工具重新生成一个“功能等价”的版本。

## 几百万个文件如何跨越平台限制

原样复制又带来了新问题：付费 Workers 当时每次调用最多只能发起 1,000 个 subrequests。一个包含几千个文件的包，在一次 Worker 执行中就会超过上限。

只增加并行数量没有用，因为每个 Worker 调用仍然受同一个单次上限约束。正确做法是缩小工作单元：

1. 按包名对迁移任务分片。
2. 把分片写入 Queues。
3. 由大量独立 Worker 调用分别处理。
4. 每次调用只复制上限以内的一部分。
5. 依赖至少一次投递重试失败任务。
6. 保证重复执行不会产生错误结果。

这不是让一个 Worker 变得无限强，而是把一个无法可靠完成的大任务，变成许多可重试、可观测、可独立完成的小任务。

cdnjs 最终撞到了两个公开平台限制：每次 Worker 调用 1,000 个 subrequests，以及每个 Workflow 1,024 个步骤。Cloudflare 产品团队随后把付费计划的 subrequest 上限提高到最多 1,000 万，并把 Workflows 默认上限提高到 10,000 步、可配置到 25,000 步。

这正是 dogfooding 的产品价值：内部真实业务暴露公开产品的边界，然后边界不是只为内部团队开后门，而是为所有用户一起提高。

## 最后的结果，以及文章没有证明的事情

原文称，从 2026 年 6 月 23 日起，cdnjs 已经运行在 Cloudflare Developer Platform 上。迁移带来的结果包括：

- 每天继续处理约 90 亿次请求，平均约 108,000 请求/秒。
- R2 成为文件内容的唯一事实来源，消除了 KV 与 GitHub 的双重权威。
- KV 回到高频读取元数据的职责。
- Workflows 保存发布任务状态，失败后可以恢复。
- DigitalOcean Spaces 提供独立存储副本和在线回退。
- 退役 GCP Functions、git-sync VM、GCS buckets、容器镜像和服务账号后，需要保护、修补和审计的组件变少。
- 迁移压力推动了 Workers 和 Workflows 的公开上限提升。
- 新流水线未来可以扩展为发布浏览器原生 ESM，但 Cloudflare 尚未承诺实施。

需要注意，文章没有给出迁移前后的延迟、成本或故障率对照。Cloudflare 也明确说，迁移不是因为旧 CDN 太慢。因此最主要的收益是数据一致性、可观测性、故障恢复、安全面缩小和后续演进能力，不能擅自总结成“迁移后性能提升了多少”。

“完全迁移”也有两个细节。第一，在 GitHub 历史内容全部回填到 R2 之前，链路中暂时还保留一个 Cloudflare 托管的旧 origin。第二，文章承认旧系统留下的部分 SRI 记录仍有历史不匹配问题，团队还在处理。

原文开头还列出了 D1，但正文和新架构图没有说明 D1 具体保存什么。因此可以确认 D1 属于文章列举的平台组件，却不能仅凭本文断言它承担了包目录、Workflow 状态或其他特定职责。

## 我从这次迁移中学到什么

把整件事压缩成一句话，就是三个“收敛”：

1. **数据收敛**：文件只以 R2 为权威来源，消除 split-brain。
2. **流程收敛**：Workflows 保存完整任务状态，不再靠对象事件和人工拼日志推断流程。
3. **故障收敛**：Queue 负责重试，Durable Object 负责并发汇合，DigitalOcean 负责存储回退，每种故障都有明确归属。

真正困难的并不是选出 R2、KV、Queues 或 Containers，而是先定义清楚：什么是不可变的公共契约，谁是唯一事实来源，每个失败由谁重试，重复执行是否安全，父任务如何确认所有子任务完成。

当这些问题有了明确答案，技术组件才不是产品名的堆砌，而是一套可以解释、恢复和演进的系统。

## 延伸阅读

- [原文：Dogfooding at scale: migrating cdnjs to Cloudflare's Developer Platform](https://blog.cloudflare.com/cdnjs-dev-platform-migration/)
- [本文章的来源：技术简报 2026-07-31](/digest/2026/07/31/)
- [Cloudflare Workflows 文档](https://developers.cloudflare.com/workflows/)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [Cloudflare KV 文档](https://developers.cloudflare.com/kv/)
- [Cloudflare Queues 文档](https://developers.cloudflare.com/queues/)
- [Cloudflare Containers 文档](https://developers.cloudflare.com/containers/)
- [Workflows 步骤上限更新](https://developers.cloudflare.com/changelog/post/2026-03-03-step-limits-to-25k/)
