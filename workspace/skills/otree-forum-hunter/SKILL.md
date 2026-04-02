---
name: otree-forum-hunter
description: Scan oTree forum for development opportunities, analyze problems, create GitHub issues, and generate blog posts.
metadata:
  {
    "openclaw":
      {
        "emoji": "🎯",
        "requires":
          {
            "bins": ["gh"],
          },
      },
  }
---

# oTree Forum 商机挖掘技能

每小时扫描 oTree Forum，识别潜在开发机会，创建 GitHub Issues 追踪，并生成 Blog 内容。

## 执行流程

### 步骤 1：抓取论坛列表

```bash
# 抓取第 1 页
curl -s https://www.otreehub.com/forum/ | grep -oP '<h4><a href="/forum/\d+/">[^<]+' | head -20

# 抓取第 2 页（如果有分页）
curl -s https://www.otreehub.com/forum/?page=2 | grep -oP '<h4><a href="/forum/\d+/">[^<]+' | head -20
```

**提取信息：**
- 问题标题
- 问题链接 `/forum/1258/`
- 作者
- 回复数
- 发布时间

### 步骤 2：抓取问题详情

```bash
curl -s https://www.otreehub.com/forum/1258/ | grep -oP '(?<=<div class="post-content">)[\s\S]*?(?=</div>)'
```

### 步骤 3：问题分析

对每个问题评估：
- **技术难度**: 简单/中等/复杂
- **商业价值**: 是否有收入潜力
- **Blog 价值**: 是否有普遍性，值得写文章
- **紧急程度**: 是否需要快速响应

### 步骤 4：创建/更新 GitHub Issue

**Master Issue (otree-forum-tracker.md):**
- 更新问题追踪表格
- 标记新问题
- 记录状态变化

**单个问题 Issue（如需要）:**
```bash
gh issue create \
  --title "[oTree Forum] 问题标题" \
  --body "## 问题链接\n\nhttps://www.otreehub.com/forum/1258/\n\n## 问题描述\n\n...\n\n## 分析\n\n...\n\n## 建议方案\n\n..." \
  --label "otree-forum" \
  --repo The-Three-Fish/the-three-fish.github.io
```

### 步骤 5：生成解决方案

对 Rowan 标记的问题：
1. 详细技术分析
2. 提供代码示例
3. 测试解决方案
4. 准备 Forum 回复草稿

### 步骤 6：创建 Blog 文章

对高价值问题：
1. 在 `src/content/blog/` 创建 Markdown
2. 包含：
   - 问题背景
   - 技术难点
   - 解决方案
   - 代码示例
   - 总结
3. 构建并发布

```bash
cd /tmp/the-three-fish.github.io
npm run build
git add .
git commit -m "feat: add oTree tutorial - [标题]"
git push
```

### 步骤 7: Forum 回复

在用户确认解决方案后：
```bash
# 在论坛回复（手动或自动）
# 提供解决方案 + Blog 链接
```

## 问题分类

### 高优先级（立即处理）
- 明确提到预算/报酬
- 紧急部署问题
- 复杂功能开发需求

### 中优先级（分析后决定）
- 技术 bug 修复
- 性能优化问题
- 有 Blog 价值的问题

### 低优先级（可选）
- 简单配置问题
- 重复问题
- 已解决的问题

## GitHub Issue 模板

```markdown
## 📋 问题信息
- **标题**: 
- **链接**: 
- **作者**: 
- **发布时间**: 
- **回复数**: 

## 📝 问题描述
[复制原文]

## 🔍 技术分析
[分析内容]

## 💡 建议方案
[解决步骤]

## 📊 评估
- 技术难度：⭐⭐⭐
- 商业价值：💰💰
- Blog 价值：📝
- 紧急程度：🔥

## ✅ 下一步
- [ ] Rowan 确认
- [ ] 提供详细方案
- [ ] Forum 回复
- [ ] 创建 Blog
```

## 注意事项

1. **不要自动回复 Forum** - 等用户确认
2. **优先高价值问题** - 时间有限
3. **Blog 质量第一** - 吸引潜在客户
4. **记录所有互动** - 追踪转化
