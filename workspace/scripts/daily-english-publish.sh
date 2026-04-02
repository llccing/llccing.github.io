#!/bin/bash
# 每日英文 - Git 构建发布脚本
# 由 cron isolated session 生成内容后调用

set -e

BLOG_DIR="/root/.openclaw/workspace/blog"
LOG_FILE="/root/.openclaw/workspace/logs/daily-english-publish.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========== 开始构建和发布 =========="

cd "$BLOG_DIR"

# 构建
log "构建博客..."
npm run build 2>&1 | tail -10 >> "$LOG_FILE"

# 提交
log "提交到 Git..."
git add src/content/blog/daily-english-reading-*.md
git commit -m "feat: daily english $(date +%Y-%m-%d)" 2>&1 >> "$LOG_FILE" || log "无新内容"

# 推送
log "推送到远程..."
git pull --rebase origin main 2>&1 >> "$LOG_FILE"
git push origin main 2>&1 >> "$LOG_FILE"

log "========== 完成 =========="
