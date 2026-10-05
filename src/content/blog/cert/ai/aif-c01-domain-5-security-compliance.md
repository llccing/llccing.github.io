---
pubDatetime: 2026-10-04T16:18:00+08:00
title: "AIF-C01 领域五：AI 的安全、合规与治理"
slug: aif-c01-domain-5-security-compliance
featured: false
draft: true
tags:
  - certification
  - aws
  - ai
  - study-note
description: AIF-C01 领域五学习笔记：AI 安全边界、访问控制、数据隐私、PII 保护与 AWS 治理工具。
---

> 状态：🚧 编写中 —— 边学边填。

## 1. AI 安全与传统安全的差异

- **新攻击面**：提示注入、训练数据投毒、模型窃取、对抗样本
- **数据流更长**：数据 → 训练 → 推理 → 输出，每一环都要防护
- **合规更严**：涉及 PII、版权、跨境数据流动

## 2. 常见威胁

| 威胁 | 说明 |
|---|---|
| Prompt Injection | 用户输入劫持模型行为 |
| Jailbreak | 绕过安全限制生成违规内容 |
| Data Poisoning | 污染训练数据破坏模型 |
| Model Inversion | 从模型反推训练数据 |
| Data Leakage | 敏感数据出现在输出中 |

## 3. AWS 安全与治理工具

| 工具 | 作用 |
|---|---|
| IAM | 身份与访问权限控制 |
| KMS | 密钥管理与加密 |
| CloudTrail | 审计日志与操作追踪 |
| Macie | 自动发现 S3 中的 PII |
| Config | 资源配置合规检查 |
| GuardDuty | 威胁检测 |
| Bedrock Guardrails | GenAI 专用内容与 PII 防护 |

## 4. 数据隐私要点

- **PII（个人身份信息）**：姓名、身份证、电话、邮箱等
- 数据分类分级 → 加密存储与传输 → 最小权限访问
- 训练数据去标识化（anonymization / pseudonymization）
- 遵守 GDPR / 个保法等法规

## 5. 合规框架

- **AWS Shared Responsibility Model**：AWS 负责云的安全，你负责云中的安全
- **AWS Artifact**：下载合规报告
- **AWS Well-Architected Framework** 的安全支柱

## 6. 易错点

- [ ] 以为用了云服务就自动合规
- [ ] 混淆加密"传输中"与"静态"
- [ ] 忽视提示注入属于安全范畴

## 7. 自测题

1. 用户通过精心构造的输入让 AI 泄露系统提示，属于哪类攻击？
2. 用哪个服务可以自动发现 S3 中的敏感数据？
3. Shared Responsibility Model 下，训练数据的安全由谁负责？
