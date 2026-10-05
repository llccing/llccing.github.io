---
pubDatetime: 2026-10-04T16:14:00+08:00
title: "AIF-C01 领域三：基础模型的应用"
slug: aif-c01-domain-3-foundation-models
featured: false
draft: true
tags:
  - certification
  - aws
  - ai
  - study-note
description: AIF-C01 领域三学习笔记：Amazon Bedrock、RAG 架构、向量数据库、模型选型与调优。
---

> 状态：🚧 编写中 —— 边学边填。

## 1. Amazon Bedrock（本领域核心）

通过统一 API 调用多家厂商的基础模型，无需自己搭基础设施。

| 能力 | 作用 |
|---|---|
| Model Access | 一键开通多家 FM（Anthropic、Meta、Amazon 等） |
| Playground | 无代码试验提示与模型对比 |
| Knowledge Bases | 托管 RAG，接入私有数据 |
| Agents | 让模型调用工具/API 完成多步任务 |
| Guardrails | 内容过滤、主题限制、PII 脱敏 |
| Model Evaluation | 对比不同模型的输出质量 |

## 2. Bedrock vs SageMaker

| 维度 | Bedrock | SageMaker |
|---|---|---|
| 定位 | 直接用别人训好的 FM | 自己训练/部署模型 |
| 门槛 | 低，API 调用 | 高，需要 ML 工程能力 |
| 场景 | 快速构建 GenAI 应用 | 深度定制、自有模型 |
| 一句话 | "租模型" | "造模型" |

## 3. RAG（检索增强生成）

```
用户提问
   ↓
[Embedding] → 向量检索 → 从知识库取出相关片段
   ↓
把「片段 + 问题」一起交给 FM
   ↓
生成有依据的回答
```

- **解决什么**：模型知识过时、幻觉、私有数据无法访问
- **关键组件**：文档切分（chunking）、Embedding 模型、向量数据库
- **与微调的取舍**：RAG 适合"知识更新频繁"，微调适合"风格/能力定制"

## 4. 模型选型考虑

- 能力 vs 成本 vs 延迟 的三角权衡
- 上下文窗口大小
- 是否支持多模态
- 是否需要本地/私有部署
- 推理价格（按 Token 计费）

## 5. 模型调优手段

| 手段 | 成本 | 效果 |
|---|---|---|
| Prompt Engineering | 最低 | 快速见效 |
| RAG | 中 | 注入外部知识 |
| Fine-tuning | 高 | 改变模型行为/风格 |
| Continued Pre-training | 最高 | 领域深度适配 |

## 6. 动手任务

- [ ] 在 Bedrock Playground 跑通一次对话
- [ ] 对比两个不同 FM 对同一 prompt 的回答
- [ ] 创建 Knowledge Base 并测试 RAG 问答（见 `experiments/`）

## 7. 易错点

- [ ] 混淆 RAG 与微调的适用场景
- [ ] 以为 Bedrock 是训练平台
- [ ] 忽视 Token 计费带来的成本差异

## 8. 自测题

1. 公司要在不重新训练模型的前提下让 AI 回答内部文档，应该用哪种方案？
2. Bedrock Guardrails 能解决哪类问题？
3. 什么时候应该选 SageMaker 而不是 Bedrock？
