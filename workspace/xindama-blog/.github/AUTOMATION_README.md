# 自动化博客文章生成工作流

这个工作流可以自动从 `plan.md` 文件中选择主题，使用 Google Gemini API 生成oTree技术博客文章草稿。

## 设置步骤

### 1. 获取 Gemini API 密钥
1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 创建一个新的API密钥

### 2. 配置 GitHub Secrets
1. 在GitHub仓库中，转到 `Settings` > `Secrets and variables` > `Actions`
2. 点击 `New repository secret`
3. 名称: `GEMINI_API_KEY`
4. 值: 粘贴您的Gemini API密钥

### 3. 使用工作流
1. 转到仓库的 `Actions` 标签
2. 选择 "Generate oTree Blog Post Draft"
3. 点击 "Run workflow"

## 工作原理

1. **触发**: 您手动启动GitHub Action
2. **选择主题**: 脚本读取 `plan.md`，找到下一个未完成的主题（`- [ ]`）
3. **生成内容**: 调用Gemini API生成中文oTree技术博客文章
4. **创建PR**: 保存生成的文章到 `src/content/blog/`，更新 `plan.md`，并创建Pull Request
5. **审查**: 您收到PR通知，可以审查、编辑内容
6. **发布**: 满意后合并PR，现有的部署工作流会自动发布文章

## 文件结构

- `plan.md` - 博客主题规划文件（使用复选框格式）
- `.github/scripts/generate_post.py` - 主要的Python脚本
- `.github/workflows/generate-blog.yml` - GitHub Actions工作流
- `src/content/blog/` - 生成的博客文章存储位置

## 自定义

您可以通过编辑 `generate_post.py` 中的提示词来自定义AI生成的内容风格和结构。
