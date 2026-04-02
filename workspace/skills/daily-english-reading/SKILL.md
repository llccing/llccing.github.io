---
name: daily-english-reading
description: Daily English reading article generator for B2 learners. Finds articles, generates audio, translates, and publishes to blog.
metadata:
  {
    "openclaw":
      {
        "emoji": "📖",
        "requires":
          {
            "bins": ["whisper", "mcporter"],
          },
        "install":
          [
            {
              "id": "node-mcporter",
              "kind": "node",
              "package": "mcporter",
              "bins": ["mcporter"],
              "label": "Install mcporter (MCP CLI)",
            },
          ],
      },
  }
---

# 每日英文阅读生成技能

为 B2 级别英语学习者生成每日阅读文章，包括英文原文、中文翻译和音频。

## 执行流程

### 步骤 1：搜索文章

使用 agent-browser 搜索合适的文章：

**搜索来源推荐：**
- GQ Wellness (https://www.gq.com/wellness)
- BBC Future (https://www.bbc.com/future)
- Medium (https://medium.com/tag/technology, https://medium.com/tag/health)
- Harvard Health Blog (https://www.health.harvard.edu/blog)

**搜索关键词示例：**
```
site:gq.com wellness sleep OR health OR technology 2025..2026
site:bbc.com future brain OR mind OR health
```

**文章选择标准：**
- 长度：800-1500 词（约 5 分钟阅读时间）
- 难度：B2 级别（中高级，适合有基础的英语学习者）
- 主题：科技、生活、健康
- 时效性：最近 6 个月内的文章

### 步骤 2：提取文章内容

使用 agent-browser 访问文章页面，提取：
- 标题
- 作者
- 发布日期
- 正文内容（按段落）
- 原文链接

### 步骤 3：生成音频

**方案 A：使用 TTS 工具**
```bash
# 如果有 TTS 工具可用
tts --text "article content" --output /tmp/article_audio.mp3
```

**方案 B：使用 OpenAI TTS API**
```bash
# 使用 curl 调用 OpenAI TTS API
curl https://api.openai.com/v1/audio/speech \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "input": "article content",
    "voice": "alloy",
    "response_format": "mp3"
  }' \
  --output /tmp/article_audio.mp3
```

### 步骤 4：上传音频到腾讯云 COS

⚠️ **重要：必须使用 mcporter + 指定的 COS 配置上传，禁止使用 lightclaw_upload_file！**

`lightclaw_upload_file` 上传的文件需要登录认证才能访问，不适合公开访问的博客资源。

```bash
# 使用 mcporter 调用腾讯云 COS（正确方式）
mcporter call cos-mcp.putObject \
  --config ~/.mcporter/mcporter.json \
  --output json \
  --args '{
    "filePath": "/tmp/article_audio.mp3",
    "fileName": "YYYY-MM-DD-article.mp3",
    "targetDir": "audio"
  }'
```

**COS 配置（~/.mcporter/mcporter.json）：**
```json
{
  "mcpServers": {
    "cos-mcp": {
      "command": "npx",
      "args": ["cos-mcp", "--Region=ap-shanghai", "--Bucket=reading-audios-1308187607", "--SecretId=xxx", "--SecretKey=xxx", "--connectType=stdio"]
    }
  }
}
```

**正确的公开访问链接格式：**
```
https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/audio/YYYY-MM-DD-article.mp3
```

**❌ 错误方式（禁止使用）：**
- `lightclaw_upload_file` → 返回的链接需要登录认证（NEED_UIN_AND_SKEY 错误）
- `https://lightai.cloud.tencent.com/cosmanager/getFileStream?filePath=xxx` → 私有访问链接

### 步骤 5：逐段翻译

将文章按段落翻译成中文，保持：
- 准确性
- 流畅性
- 易于理解

### 步骤 6：创建博客文章

在 `/root/.openclaw/workspace/blog/src/content/blog/` 创建 Markdown 文件：

```markdown
---
pubDatetime: YYYY-MM-DDTHH:MM:SSZ
title: [英文标题]
slug: [slugified-title]
featured: false
draft: false
tags:
  - English Learning
  - Daily Reading
  - B2 Level
  - [主题标签]
description: [简短描述]
---

<!-- English Original Audio (TTS) -->
<h3>🎧 English Original Audio (TTS)</h3>
<audio controls>
  <source src="https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/audio/[文件名].mp3" type="audio/mpeg">
  Your browser does not support the audio element.
</audio>

---

<!-- User's Reading (to be uploaded) -->
<h3>Rowan's Reading</h3>
<p>Waiting for your recording...</p>

---

## Part 1

**English:**
[英文段落 1]

**Chinese:**
[中文翻译 1]

---

## Part 2

**English:**
[英文段落 2]

**Chinese:**
[中文翻译 2]

---

### Vocabulary

| English | Chinese |
|---------|---------|
| word1 | 翻译 1 |
| word2 | 翻译 2 |

---

_Source: [原文链接] | Author: [作者] | [发布日期]_
```

### 步骤 7：构建并发布

```bash
cd /root/.openclaw/workspace/blog

# 构建
npm run build

# 提交
git add src/content/blog/[slug].md
git commit -m "feat: add daily English reading [标题]"
git push
```

## 注意事项

1. **音频时长**：控制在 5 分钟左右
2. **翻译质量**：确保准确且易读，不要机器翻译痕迹太重
3. **词汇表**：提取 5-10 个 B2 级别关键词汇
4. **发布时间**：设置为当天早上 7 点（UTC 时间），这样用户起床时可以看到
5. **版权**：确保文章可以合理使用，注明原文链接和作者
6. **⚠️ 文件上传方式（重要）**：
   - ✅ 必须使用 `mcporter call cos-mcp.putObject` 上传到 `reading-audios-1308187607` bucket
   - ❌ 禁止使用 `lightclaw_upload_file`（返回的链接需要登录认证，无法公开访问）
   - 验证方式：上传后用 `curl -sI <链接>` 检查，返回 `200 OK` 且不需要认证才是正确的

## 错误处理

- 如果找不到合适的文章，尝试不同的来源
- 如果 TTS 失败，检查 API 密钥和网络连接
- 如果 COS 上传失败，检查存储桶权限
- 如果构建失败，检查 Markdown 格式
