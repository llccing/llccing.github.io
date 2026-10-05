---
pubDatetime: 2026-10-04T16:12:00+08:00
title: "AIF-C01 领域二：生成式 AI 基础"
slug: aif-c01-domain-2-generative-ai
featured: false
draft: true
tags:
  - certification
  - aws
  - ai
  - study-note
description: AIF-C01 领域二学习笔记：基础模型、Token、Embedding、提示工程、幻觉及其缓解。
---

> 状态：🚧 编写中 —— 边学边填。

## 1. 生成式 AI vs 传统 ML

| 维度 | 传统 ML | 生成式 AI |
|---|---|---|
| 输出 | 标签 / 数值 | 新内容（文本/图像/代码） |
| 训练 | 针对单一任务 | 大规模预训练 + 微调 |
| 典型 | 分类器、回归 | LLM、扩散模型 |

## 2. 基础模型（Foundation Model, FM）

- 在海量数据上预训练、可适配多种下游任务的大模型
- **LLM** 是 FM 中处理文本的分支
- **多模态模型**：同时处理文本、图像、音频

## 3. 核心概念

| 术语 | 说明 |
|---|---|
| Token | 模型处理文本的最小单位（≈4 字符 / 0.75 单词） |
| 上下文窗口 Context Window | 模型单次能"看到"的 Token 上限 |
| Embedding | 把文本/图像映射为高维向量，用于相似度检索 |
| 温度 Temperature | 控制输出随机性，越高越发散 |
| Top-p / Top-k | 采样策略，控制候选范围 |
| 参数 Parameters | 模型规模，通常越大能力越强 |

## 4. 提示工程（Prompt Engineering）

- **Zero-shot**：只给任务，不给示例
- **Few-shot**：给几个示例再提问
- **Chain-of-Thought（CoT）**：让模型"一步步想"
- **System Prompt**：设定角色与约束
- **提示注入（Prompt Injection）**：安全风险，需要 Guardrails 防护

## 5. 幻觉（Hallucination）

- **成因**：模型在生成"看起来合理"的内容，而非查询事实
- **缓解手段**：
  - RAG（用外部知识库约束输出）
  - 要求引用来源
  - 调低温度
  - 人工审核 / Guardrails

## 6. 模型评估指标

| 指标 | 适用 | 说明 |
|---|---|---|
| ROUGE | 摘要 | 召回导向，看覆盖了多少参考内容 |
| BLEU | 翻译 | 精确导向，看 n-gram 匹配 |
| BERTScore | 通用文本相似 | 基于语义向量 |
| Perplexity | 语言模型 | 越低越好 |
| 人类评估 | 主观质量 | 最可靠但成本高 |

## 7. 易错点

- [ ] 混淆 ROUGE（摘要）与 BLEU（翻译）的导向
- [ ] 以为提高温度能让输出更"准确"
- [ ] 忽视上下文窗口的硬限制

## 8. 自测题

1. 为什么 RAG 能有效缓解幻觉？
2. few-shot 和 fine-tuning 的本质区别是什么？
3. 上下文窗口超限会发生什么？
