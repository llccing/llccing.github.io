# AWS 认证备考资料

从已归档的 [FrontEnd](https://github.com/llccing/FrontEnd) 仓库（VuePress）整理迁移过来的 AWS 认证备考笔记。

> ⚠️ 本目录**不属于 Astro 内容目录**（`src/content/`），因此**不会**被构建成博客文章，仅作为仓库内的参考资料保留。

## 目录结构

```
certifications/aws/
├── CPE/                          # AWS Certified AI Practitioner (AIF-C01)
│   ├── 01Features/               # 15 个 AWS AI 服务速查（Bedrock / SageMaker / Comprehend ...）
│   ├── 02Terms/                  # 22 个关键术语（Hallucination / RLHF / XGBoost ...）
│   ├── 03TrickQuestions/         # 44 道易错/真题解析
│   └── README.md
└── SAA/                          # AWS Certified Solutions Architect – Associate（已通过）
    ├── 01Features/               # 80+ AWS 服务速查
    ├── 02Examtopics/             # ExamTopics 题库（Questions + Answers + Self-test + 错题本）
    ├── 03PreExams/               # 历次模考记录（日期命名）
    └── README.md
```

## 备考优先级（当前目标：先考 AIF-C01）

1. **CPE/02Terms** — 术语是理解题目的基础，先过一遍
2. **CPE/01Features** — 每个 AI 服务的定位与差异（Bedrock vs SageMaker 是高频考点）
3. **CPE/03TrickQuestions** — 44 道题带着看，暴露薄弱点
4. 配套动手实验见仓库根目录 `experiments/aif-c01/`

## 迁移说明

| 项目 | 说明 |
|---|---|
| 来源 | `llccing/FrontEnd` → `docs/AWS/` |
| 迁移时间 | 2026-10-06 |
| 迁移方式 | 目录整体复制，内容不改写（无 frontmatter，非 blog 格式） |
| 命名调整 | `03Trick-Questions.md/` → `03TrickQuestions/`（原为名字带 `.md` 的目录，易混淆）<br>`Recall-Oriented Understudy.md` → `Recall-Oriented-Understudy.md`（去掉空格） |

## 后续计划

- [ ] AIF-C01 备考内容补充到 `src/content/blog/cert/ai/`
- [ ] 考完后把精选内容整理成正式博客文章
- [ ] SAA 部分保持归档状态（认证已通过）
