#!/usr/bin/env node

/**
 * 每日英文阅读自动化脚本
 * 功能：生成文章、TTS、创建博客、发布
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = '/root/.openclaw/workspace';
const BLOG_DIR = path.join(WORKSPACE, 'blog');
const LOG_FILE = path.join(WORKSPACE, 'logs', 'daily-english.log');

// 确保日志目录存在
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(LOG_FILE, line);
}

function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
  } catch (error) {
    log(`❌ 命令执行失败: ${cmd}`);
    log(`错误: ${error.message}`);
    throw error;
  }
}

async function main() {
  log('========== 开始执行每日英文任务 ==========');
  
  try {
    // 步骤 1: 生成文章内容
    log('步骤 1/5: 生成文章内容...');
    const date = new Date().toISOString().split('T')[0];
    const topics = ['technology', 'health', 'environment', 'science', 'lifestyle'];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    
    log(`✅ 选择主题: ${topic}`);
    
    // 步骤 2: 调用 sessions_spawn 生成内容
    log('步骤 2/5: 调用 AI 生成文章和音频...');
    const taskMessage = `生成一篇关于 ${topic} 的 B2 级别英文文章（600-800词），然后用 tts 工具转为音频，最后用 lightclaw_upload_file 上传音频。返回 JSON 格式：{"title":"...","content":"...","audioUrl":"...","vocabulary":[...]}`;
    
    // 这里需要通过 OpenClaw API 调用，暂时记录任务
    log('⚠️ 需要集成 OpenClaw API 调用');
    
    // 步骤 3: 创建博客文章
    log('步骤 3/5: 创建博客文章...');
    const slug = `daily-english-reading-${topic}-${date}`;
    const blogPath = path.join(BLOG_DIR, 'src/content/blog', `${slug}.md`);
    
    // 临时跳过，等待 API 集成
    log('⚠️ 等待内容生成完成');
    
    // 步骤 4: 构建博客
    log('步骤 4/5: 构建博客...');
    process.chdir(BLOG_DIR);
    exec('npm run build', { silent: true });
    log('✅ 博客构建完成');
    
    // 步骤 5: Git 提交和推送
    log('步骤 5/5: 提交到 Git...');
    exec(`git add src/content/blog/${slug}.md`);
    exec(`git commit -m "feat: add daily english reading - ${topic} (${date})"`);
    exec('git pull --rebase origin main');
    exec('git push origin main');
    log('✅ 推送完成');
    
    log('========== 任务执行完成 ==========');
    log(`博客地址: https://rowanliu.com/blog/${slug}`);
    
  } catch (error) {
    log(`❌ 任务失败: ${error.message}`);
    process.exit(1);
  }
}

main();
