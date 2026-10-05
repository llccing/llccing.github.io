---
pubDatetime: 2026-10-04T16:00:00+08:00
title: "AWS AIF-C01 备考总览：从 SAA 到 AI Practitioner"
slug: aws-aif-c01-overview
featured: false
draft: false
tags:
  - certification
  - aws
  - ai
  - study-plan
description: 继 AWS SAA 之后，把 AI 认证这条线接上。这篇是 AWS Certified AI Practitioner（AIF-C01）的备考总览：认证定位、考纲五大领域、逐周学习计划、资源清单与自测节点。
---

## 前言

2026 年 AWS 把 AI 认证体系重做了一遍，我打算顺着 SAA 的路线继续往 AI 方向走，第一站选 **AWS Certified AI Practitioner（AIF-C01）**。

选它的理由很简单：

- **门槛低**：无需编程或 ML 基础，考的是"理解"而不是"实现"。
- **术语通用**：基础模型、提示工程、RAG、负责任 AI 这套词汇可以迁移到后面所有厂商的认证。
- **性价比高**：主流云厂商里最便宜的权威 AI 证书。
- **衔接后续**：AIF-C01 → MLA-C01（ML Engineer Associate）→ AIP-C01（GenAI Developer Professional）是一条清晰的阶梯。

> ⚠️ 顺带记录一个重要变化：**AWS Certified Machine Learning – Specialty 已于 2026 年 3 月 31 日退役**，不能再考。它被 ML Engineer Associate（MLOps 向）+ GenAI Developer Professional（生成式 AI 向）两个认证替代。

---

## 一、认证速览

| 项目 | 详情 |
|---|---|
| 认证名称 | AWS Certified AI Practitioner |
| 考试代码 | AIF-C01 |
| 等级 | Foundational（基础级） |
| 费用 | ~$100 USD |
| 时长 / 题量 | 90 分钟 / 65 题（部分资料写 85 题 120 分钟，以官网为准） |
| 通过分 | 700 / 1000 |
| 有效期 | 3 年 |
| 前置要求 | 无 |
| 考试形式 | 监考选择题（线上或考点） |

**适合人群**：在 AI 周围工作但未必亲手训练模型的人 —— 产品、项目经理、分析师、售前、市场，以及想把 AI 补进简历的云工程师。

---

## 二、考纲五大领域（Domain）

| # | 领域 | 大致占比 | 核心考点 |
|---|---|---|---|
| 1 | AI 与 ML 基础 | ~20% | AI/ML/深度学习区别、监督/无监督/强化学习、模型评估指标 |
| 2 | 生成式 AI 基础 | ~24% | 基础模型 FM、Token、Embedding、提示工程、幻觉与缓解 |
| 3 | 基础模型应用 | ~28% | Amazon Bedrock、RAG、向量数据库、模型选型与调优 |
| 4 | 负责任 AI | ~14% | 公平性、偏见、可解释性、数据治理、合规 |
| 5 | AI 安全 / 合规 / 治理 | ~14% | 安全边界、访问控制、数据隐私、AWS 治理工具 |

> 占比为常见区间，**报考前请下载官网最新 Exam Guide 核对**。

**AWS AI 服务地图（需要能分辨各自用途）**：

| 服务 | 一句话定位 |
|---|---|
| Amazon Bedrock | 通过 API 调用多家基础模型，构建生成式 AI 应用 |
| Amazon SageMaker | 端到端 ML 平台：训练、调优、部署、监控 |
| Amazon Comprehend | 自然语言处理（情感、实体、关键词） |
| Amazon Rekognition | 图像与视频分析（人脸、物体、内容审核） |
| Amazon Textract | 从文档中抽取文本与表格 |
| Amazon Transcribe / Polly | 语音转文字 / 文字转语音 |
| Amazon Translate | 机器翻译 |
| Amazon Forecast | 时间序列预测 |
| Amazon Q | 面向业务的生成式 AI 助手 |

---

## 三、逐周学习计划（4 周冲刺）

> 假设每天可投入 1–1.5 小时，周末各 3 小时。可按实际节奏压缩或拉长。

### Week 1 — 打地基：AI/ML 概念 + AWS AI 服务全景
- [ ] 通读官方 Exam Guide，标注五大领域占比
- [ ] 学习 AI / ML / DL 的区别，监督 vs 无监督 vs 强化学习
- [ ] 熟悉 AWS AI 服务地图（上表），重点是 Bedrock vs SageMaker 的分工
- [ ] 完成 AWS Skill Builder 的 *Fundamentals of AI and ML* 免费课程
- **自测**：能不看资料说出 9 个 AWS AI 服务的用途

### Week 2 — 生成式 AI 与提示工程
- [ ] 基础模型（FM）概念、Token、上下文窗口、Embedding
- [ ] 提示工程技巧：zero-shot / few-shot / chain-of-thought
- [ ] 幻觉（hallucination）成因与缓解手段
- [ ] 模型评估指标：ROUGE、BLEU、BERTScore、perplexity
- **自测**：手写 3 个不同风格的 prompt 并说明差异

### Week 3 — Bedrock / RAG + 动手实验
- [ ] Amazon Bedrock 核心能力：模型选择、Knowledge Bases、Agents、Guardrails
- [ ] RAG 架构原理：检索 → 增强 → 生成，向量数据库的作用
- [ ] 动手：在 Bedrock Playground 跑通一次模型调用（见 `experiments/`）
- [ ] 动手：搭一个最小 RAG 流程（哪怕是本地 demo）
- **自测**：画出 RAG 的完整数据流图

### Week 4 — 负责任 AI + 安全合规 + 模拟冲刺
- [ ] 负责任 AI：公平性、偏见来源、可解释性、透明性
- [ ] 安全与合规：数据隐私（PII）、访问控制（IAM）、加密、审计
- [ ] 通读所有章节笔记，交叉复习错题本
- [ ] 完整做 2–3 套模拟题，**正确率稳定 85%+** 再约考
- **自测**：模拟考连续两次 85 分以上 → 报名

---

## 四、资源清单

**官方（优先）**
- AWS Skill Builder — *AWS Certified AI Practitioner* 官方学习路径（部分免费）
- AWS 官方 Exam Guide（务必下载最新版）
- AWS 官方样题（Official Practice Question Set）
- AWS AI & ML Scholars 计划（历年 6/24 前开放，可免费拿 AI Practitioner 培训）

**社区**
- Tutorials Dojo / Whizlabs 的 AIF-C01 练习题库
- AWS 官方博客的 Bedrock / 生成式 AI 系列文章

**本目录内部**
- `aif-c01-domain-1-ai-ml-fundamentals.md` — 领域一笔记
- `aif-c01-domain-2-generative-ai.md` — 领域二笔记
- `aif-c01-domain-3-foundation-models.md` — 领域三笔记
- `aif-c01-domain-4-responsible-ai.md` — 领域四笔记
- `aif-c01-domain-5-security-compliance.md` — 领域五笔记
- `aif-c01-question-bank.md` — 题库与错题记录
- `experiments/` — 动手实验代码与记录

---

## 五、后续路线（考完 AIF 之后）

1. **AWS Certified ML Engineer – Associate（MLA-C01）** ~$150 — MLOps / SageMaker 方向
2. **AWS Certified Generative AI Developer – Professional（AIP-C01）** ~$300 — Bedrock / RAG / 多智能体
3. （可选）**Google Cloud Professional ML Engineer** $200 — 技术线终点，注意 2026-06 后新考纲
4. （可选）**腾讯 WorkBuddy 效率智能体应用师 / OPC 从业者认证** — 顺手考的国内认证

---

## 附：本目录维护约定

- 每个领域一篇笔记，按考纲顺序命名，便于对照复习。
- 错题统一记入 `aif-c01-question-bank.md`，标注所属领域与错误原因。
- 实验过程写进 `experiments/`，包含命令、截图说明和踩坑记录。
- 状态标记：`draft: true` 表示笔记尚未完成，定稿后再改 `false`。
