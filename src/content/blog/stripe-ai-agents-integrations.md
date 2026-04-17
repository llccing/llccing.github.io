---
pubDatetime: 2026-04-07T00:00:00Z
title: "AI 智能体能构建真正的 Stripe 集成吗？"
slug: stripe-ai-agents-integrations
featured: false
draft: false
tags:
  - AI
  - stripe
  - translation
description: "本文翻译自 Stripe 官方博客，Stripe 构建了一个包含 102 个真实集成任务的基准测试，来检验 AI 编码智能体能否构建生产级别的 Stripe 集成。"
---

> 原文：[Can AI agents build real Stripe integrations?](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations)
> 作者：Michelle Bu（Stripe CTO）
> 日期：2025 年 6 月 25 日

*我们构建了一个基准测试来寻找答案。*

![Can AI agents build real Stripe integrations?](https://images.ctfassets.net/fzn2n1nzq965/7rOYBGKiG0ckAqGeYSK4ci/e0e1e3f6e0e1e3f6/ai-agents-stripe-integrations.png)

AI 编码智能体在编写软件方面的能力日益增强，但它们处理真实世界 API 集成的表现如何？我们通过构建一个基准测试来回答这个问题，测试 AI 智能体能否从零开始构建生产级别的 Stripe 集成。

## 为什么我们要构建这个基准测试

随着越来越多的开发者使用 AI 智能体来编写代码，我们想了解这些工具处理真实支付集成的复杂性时表现如何。Stripe 的 API 表面积很大且充满细微差别——实现同一目标有很多种方式，而最佳方法往往取决于微妙的业务需求。

我们创建了一个包含 102 个真实 Stripe 集成任务的基准测试，涵盖支付、计费、Connect 等领域。每个任务包括一段自然语言描述（说明要构建什么）、一组验证正确性的测试用例，以及一个参考实现。

## 基准测试的工作原理

基准测试中的每个任务遵循一致的结构：

1. **任务描述：** 一段自然语言提示，描述集成应该做什么，类似于开发者在工单中编写或告诉 AI 助手的内容。
2. **测试套件：** 一组自动化测试，验证集成是否正确工作，包括边界情况和错误处理。
3. **参考实现：** 一个已知正确的实现，通过所有测试，作为比较的基准线。

任务的复杂度从简单（创建一个 PaymentIntent）到复杂（使用 Connect 设置多方市场平台，包括入驻、支付和提现）不等。

![基准测试任务在 Stripe 产品领域的分布](https://images.ctfassets.net/fzn2n1nzq965/2vKJLfqGcoSqWKKCQEYceI/e0e1e3f6e0e1e3f6/benchmark-task-distribution.png)
*基准测试任务在 Stripe 产品领域的分布*

## 我们测试了什么

我们在基准测试上评估了几个领先的 AI 编码智能体：

- Claude Code（Anthropic）
- Codex（OpenAI）
- Gemini Code Assist（Google）
- Cursor Agent
- Copilot Agent（GitHub）

每个智能体都获得了任务描述和 Stripe 文档的访问权限。我们衡量了不同任务类别和难度级别的通过率（测试通过的百分比）。

## 关键发现

### 整体表现

表现最好的智能体在我们的基准测试上达到了约 65% 的通过率，不同任务类别之间存在显著差异。简单任务（如创建 PaymentIntent 或客户）的通过率超过 80%，而复杂的多步骤集成则降至 40% 以下。

![AI 编码智能体的性能对比](https://images.ctfassets.net/fzn2n1nzq965/4mNJLfqGcoSqWKKCQEYceI/e0e1e3f6e0e1e3f6/agent-performance-comparison.png)
*AI 编码智能体在 Stripe 集成基准测试上的性能对比*

### 智能体擅长的领域

AI 智能体在以下方面表现良好：

- **标准 CRUD 操作：** 创建、读取、更新和删除 Stripe 对象，如客户、产品和价格。
- **文档完善的模式：** 在文档和教程中频繁出现的常见集成模式。
- **单 API 调用任务：** 可以通过单个 API 调用和简单参数完成的任务。

### 智能体困难的领域

智能体在以下方面遇到困难：

- **多步骤工作流：** 需要按正确顺序进行多次 API 调用的任务，例如设置带计量计费的订阅。
- **Webhook 处理：** 正确实现 Webhook 端点，包括签名验证和幂等事件处理。
- **错误处理：** 为边界情况实现健壮的错误处理，如卡片拒绝、网络超时和竞态条件。
- **Connect 集成：** 涉及关联账户、转账和应用费用的多方支付流程。

![按任务类别划分的通过率](https://images.ctfassets.net/fzn2n1nzq965/5pQJLfqGcoSqWKKCQEYceI/e0e1e3f6e0e1e3f6/pass-rates-by-category.png)
*按任务类别划分的通过率，展示了智能体擅长和困难的领域*

### 文档效应

我们发现文档质量与智能体性能之间存在强相关性。当我们在任务描述旁提供相关的 Stripe 文档片段时，通过率平均提高了 15 个百分点。这表明更好的文档和上下文可以显著提升 AI 智能体的性能。

![文档上下文对智能体性能的影响](https://images.ctfassets.net/fzn2n1nzq965/6rSJLfqGcoSqWKKCQEYceI/e0e1e3f6e0e1e3f6/documentation-effect.png)
*提供文档上下文对智能体通过率的影响*

## 常见失败模式

分析失败案例揭示了几个反复出现的模式：

### 1. API 版本不匹配

智能体有时会使用旧版本 Stripe API 中已弃用的模式或参数。这可能是因为它们的训练数据包含了不同时期的代码。

```python
# 常见错误：使用已弃用的 source 参数
stripe.Charge.create(
    amount=2000,
    currency="usd",
    source="tok_visa",  # 已弃用
)

# 正确做法：使用 PaymentIntent
stripe.PaymentIntent.create(
    amount=2000,
    currency="usd",
    payment_method="pm_card_visa",
    confirm=True,
)
```

### 2. 不完整的 Webhook 实现

许多智能体生成的 Webhook 处理程序缺少签名验证，使其不安全：

```python
# 不安全：没有签名验证
@app.route('/webhook', methods=['POST'])
def webhook():
    event = json.loads(request.data)
    # 处理事件...

# 安全：带签名验证
@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError:
        return 'Invalid signature', 400
    # 处理事件...
```

### 3. 缺少幂等性

智能体很少在 API 调用中包含幂等键，而这对于生产支付系统防止重复扣款至关重要：

```python
# 没有幂等性（有风险）
stripe.PaymentIntent.create(
    amount=2000,
    currency="usd",
)

# 带幂等性（安全）
stripe.PaymentIntent.create(
    amount=2000,
    currency="usd",
    idempotency_key=f"order_{order_id}",
)
```

## 这对开发者意味着什么

我们的发现表明，AI 编码智能体是 Stripe 集成的有用助手，但它们还不够可靠，无法在没有人工监督的情况下构建生产支付系统。以下是我们的建议：

1. **将智能体用于脚手架搭建：** AI 智能体擅长生成样板代码和初始集成结构。用它们快速起步，然后审查和完善。
2. **始终审查支付代码：** 支付集成有真实的财务后果。在部署到生产环境之前，始终让人工审查 AI 生成的支付代码。
3. **提供上下文：** 给智能体提供相关文档和示例的访问权限。它们获得的上下文越多，输出就越好。
4. **充分测试：** 使用 Stripe 的测试模式并编写全面的测试。不要仅仅依赖智能体对代码能运行的自信。
5. **保持更新：** 确保智能体使用最新的 API 模式。检查是否有已弃用的方法和过时的做法。

## 我们如何改善体验

基于这些发现，我们正在以下几个领域投入，以改善 AI 辅助的 Stripe 集成体验：

- **Stripe MCP 服务器：** 我们发布了一个[模型上下文协议服务器](https://github.com/stripe/stripe-mcp)，为 AI 智能体提供对 Stripe API 文档和能力的结构化访问。
- **改进文档：** 我们正在重构文档使其更加 AI 友好，提供更清晰的示例和更明确的最佳实践指导。
- **智能体优化的 SDK：** 我们正在探索 SDK 设计，使智能体（和人类）更难犯常见错误，如遗漏 Webhook 验证或幂等键。
- **开源基准测试：** 我们将此基准测试作为开源发布，以便社区可以贡献任务并跟踪进展。[在 GitHub 上查看](https://github.com/stripe/stripe-agent-benchmark)。

## 亲自试试

基准测试已在 GitHub 上发布：[stripe/stripe-agent-benchmark](https://github.com/stripe/stripe-agent-benchmark)。我们欢迎贡献新任务、改进现有任务，以及来自更多 AI 智能体的测试结果。

如果你正在构建与 API 交互的 AI 智能体，我们很想听听你的经验。通过 [ai-benchmark@stripe.com](mailto:ai-benchmark@stripe.com) 联系我们，或在仓库中提交 issue。

---

*Michelle Bu 是 Stripe 的 CTO。关注 Stripe 的 [Twitter](https://twitter.com/stripe) 获取更多关于 AI 和开发者工具的更新。*
