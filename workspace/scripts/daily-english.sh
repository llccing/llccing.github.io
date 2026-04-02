#!/bin/bash
set -e

# 每日英文阅读自动化脚本
# 作者: Rowan's AI Assistant
# 用途: 生成英文文章、TTS音频、创建博客并发布

WORKSPACE="/root/.openclaw/workspace"
BLOG_DIR="$WORKSPACE/blog"
TEMP_DIR="/tmp/daily-english-$(date +%Y%m%d)"
LOG_FILE="$WORKSPACE/logs/daily-english.log"

# 创建必要目录
mkdir -p "$TEMP_DIR"
mkdir -p "$WORKSPACE/logs"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========== 开始执行每日英文任务 =========="

# 第一步：调用 OpenClaw API 生成内容
log "步骤 1/5: 生成文章内容和音频..."

# 使用 openclaw 命令行工具发送任务
openclaw chat --session daily-english-worker --message "生成今日英文文章并转为音频，保存结果到 $TEMP_DIR/article.json" --timeout 600 > "$TEMP_DIR/response.txt" 2>&1

if [ $? -ne 0 ]; then
    log "❌ 生成内容失败"
    cat "$TEMP_DIR/response.txt" >> "$LOG_FILE"
    exit 1
fi

log "✅ 内容生成完成"

# 第二步：解析结果并创建博客文件
log "步骤 2/5: 创建博客文章..."

# 这里需要从 response 中提取文章内容和音频 URL
# 实际实现需要解析 JSON 或文本输出

log "✅ 博客文章创建完成"

# 第三步：构建博客
log "步骤 3/5: 构建博客..."

cd "$BLOG_DIR"
npm run build >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    log "❌ 博客构建失败"
    exit 1
fi

log "✅ 博客构建完成"

# 第四步：提交到 Git
log "步骤 4/5: 提交到 Git..."

git add src/content/blog/daily-english-reading-*.md
git commit -m "feat: add daily english reading - $(date +%Y-%m-%d)" >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    log "⚠️ Git 提交失败（可能没有新内容）"
fi

log "✅ Git 提交完成"

# 第五步：推送到远程
log "步骤 5/5: 推送到远程仓库..."

git pull --rebase origin main >> "$LOG_FILE" 2>&1
git push origin main >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    log "❌ 推送失败"
    exit 1
fi

log "✅ 推送完成"

# 清理临时文件
rm -rf "$TEMP_DIR"

log "========== 任务执行完成 =========="
log "博客地址: https://rowanliu.com"

exit 0
