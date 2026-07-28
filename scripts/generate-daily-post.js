/**
 * Daily Blog Post Generator Script
 * 
 * This script generates a blog post using AI or templates.
 * Usage: node scripts/generate-daily-post.js
 * 
 * Environment variables required:
 * - OPENAI_API_KEY: Your OpenAI API key (optional, falls back to template)
 * - TOPIC: The topic for the blog post
 * - CONTENT_TYPE: 'technical-note' or 'daily-english-reading'
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BLOG_DIR = path.join(__dirname, '..', 'src', 'content', 'blog');
const TEMPLATES_DIR = path.join(__dirname, '..', '.templates');

// Get current date in Beijing time (UTC+8)
function getBeijingDate() {
  const now = new Date();
  // Convert to Beijing time
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime;
}

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(date) {
  const dateStr = formatDate(date);
  return `${dateStr}T09:00:00+08:00`;
}

function generateSlug(topic) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Template-based generation (fallback when no API key)
function generateFromTemplate(contentType, topic, date) {
  const today = formatDate(date);
  const slug = generateSlug(topic);
  const filename = `daily-${contentType}-${today}-${slug}.md`;
  const filepath = path.join(BLOG_DIR, filename);

  let content = '';
  
  if (contentType === 'daily-english-reading') {
    const template = fs.readFileSync(
      path.join(TEMPLATES_DIR, 'daily-english-reading-template.md'),
      'utf-8'
    );
    content = template
      .replace(/\{\{DATE\}\}/g, today)
      .replace(/\[Topic Title\]/g, topic)
      .replace(/\[topic\]/g, topic.toLowerCase())
      .replace(/\[Article Title\]/g, topic)
      .replace(/\[中文标题\]/g, topic)
      .replace(/\[AUDIO_URL\]/g, 'https://example.com/audio.mp3')
      .replace(/\[WORD_COUNT\]/g, '850');
  } else {
    const template = fs.readFileSync(
      path.join(TEMPLATES_DIR, 'technical-note-template.md'),
      'utf-8'
    );
    content = template
      .replace(/\{\{DATE\}\}/g, formatDateTime(date))
      .replace(/\[Title: Concise and Descriptive\]/g, topic)
      .replace(/\[Brief summary in 1-2 sentences, max 160 characters\]/g, 
        `Daily technical note about ${topic}`);
  }

  // Check if file already exists
  if (fs.existsSync(filepath)) {
    console.log(`File already exists: ${filename}`);
    return null;
  }

  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(`Generated: ${filename}`);
  return filename;
}

// AI-based generation (requires AI_API_KEY)
async function generateWithAI(contentType, topic, date) {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4';

  if (!apiKey) {
    console.log('No AI_API_KEY found, using template-based generation');
    return generateFromTemplate(contentType, topic, date);
  }

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey, baseURL });

    const today = formatDate(date);
    const slug = generateSlug(topic);
    const filename = `daily-${contentType}-${today}-${slug}.md`;
    const filepath = path.join(BLOG_DIR, filename);

    // Check if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`File already exists: ${filename}`);
      return null;
    }

    const prompt = contentType === 'daily-english-reading'
      ? `Generate a B2-level English reading article about "${topic}" with approximately 850 words. Include both English and Chinese translations.`
      : `Write a technical blog post about "${topic}" with code examples and practical applications.`;

    console.log(`Using model: ${model} via ${baseURL}`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional blog writer specializing in technology and education.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const generatedContent = response.choices[0].message.content;
    
    // Add frontmatter
    const frontmatter = contentType === 'daily-english-reading'
      ? `---
title: "Daily English Reading: ${topic}"
pubDatetime: ${formatDateTime(date)}
description: "B2-level English reading article about ${topic.toLowerCase()} with audio narration and Chinese translation"
tags: ["English Learning", "${topic}", "Daily Reading"]
audioUrl: "https://example.com/audio.mp3"
---

`
      : `---
title: "${topic}"
pubDatetime: ${formatDateTime(date)}
description: "Technical insights about ${topic.toLowerCase()}"
tags: ["Technology", "${topic}"]
draft: false
---

`;

    const fullContent = frontmatter + generatedContent;
    fs.writeFileSync(filepath, fullContent, 'utf-8');
    console.log(`AI-generated: ${filename}`);
    return filename;

  } catch (error) {
    console.error('AI generation failed:', error.message);
    console.log('Falling back to template-based generation');
    return generateFromTemplate(contentType, topic, date);
  }
}

// Main execution
async function main() {
  const topic = process.env.TOPIC || 'Daily Tech Insights';
  const contentType = process.env.CONTENT_TYPE || 'technical-note';
  const date = getBeijingDate();

  console.log(`Generating ${contentType} post about: ${topic}`);
  console.log(`Date: ${formatDate(date)}`);

  try {
    const filename = await generateWithAI(contentType, topic, date);
    
    if (filename) {
      console.log(`✅ Successfully created: ${filename}`);
      console.log(`📝 Location: src/content/blog/${filename}`);
      console.log('\nNext steps:');
      console.log('1. Review and edit the generated content');
      console.log('2. Add relevant tags');
      console.log('3. Update description if needed');
      console.log('4. Set draft: false when ready to publish');
    } else {
      console.log('⚠️  No new file created (may already exist)');
    }
  } catch (error) {
    console.error('❌ Error generating post:', error.message);
    process.exit(1);
  }
}

main();
