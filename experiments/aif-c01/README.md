# AWS AIF-C01 动手实验

备考 AWS Certified AI Practitioner 的动手实验目录。**放在 content 目录之外**，避免被 Astro 当成博文采集。

配套笔记见 `../` 目录下的 `aif-c01-*.md`。

## 实验清单

| # | 实验 | 文件 | 对应领域 |
|---|---|---|---|
| EXP-001 | 调用 Bedrock 模型 | `bedrock_invoke.py` | 领域三 |
| EXP-002 | 对比两个 FM 的输出 | `compare_models.py` | 领域二 |
| EXP-003 | 最小 RAG 流程 | `minimal_rag.py` | 领域三 |
| EXP-004 | 提示工程技巧对比 | `prompt_engineering.py` | 领域二 |

## 环境准备

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install boto3

# 配置 AWS 凭据
aws configure
# 或
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=us-east-1
```

> 前提：在 Bedrock 控制台 → Model access 中开通目标模型的访问权限。

## 成本提醒

Bedrock 按 Token 计费。做实验时：
- 用最小的模型和最短的 prompt
- 试用完成后及时检查用量
- 不确定就先在 Playground 里免费试

## 踩坑记录

- （待补充）
