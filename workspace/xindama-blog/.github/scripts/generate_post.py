# .github/scripts/generate_post.py
import os
import google.generativeai as genai
import re
from datetime import datetime

# --- Configuration ---
PLAN_FILE = "plan.md"
POSTS_DIR = "src/content/blog"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set!")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')

def find_next_topic():
    """Finds the first unchecked topic in plan.md."""
    with open(PLAN_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        if line.strip().startswith("- [ ]"):
            # Extract topic title, removing the checkbox part
            topic_title = line.replace("- [ ]", "").strip()
            return topic_title, i # Return topic and its line number
    return None, -1

def generate_blog_post(topic):
    """Calls the Gemini API to generate a blog post from a topic."""
    print(f"Generating blog post for topic: {topic}")

    # --- This is the most important part: The Prompt ---
    prompt = f"""
    你是一位专业的oTree技术博客作者，专门为中文开发者撰写清晰、简洁且引人入胜的技术内容。
    你的读者主要是经济学研究者、行为实验研究人员和Python开发者。
    
    请基于以下主题撰写一篇全面的技术博客文章："{topic}"

    博客文章必须使用Markdown格式，并包含以下结构：
    1. 一个引人注目的H1标题（例如：# 我的博客标题）
    2. 简短且引人入胜的介绍（1-2段）
    3. 主体内容，使用H2标题（例如：## 章节标题）组织内容。适当使用项目符号、代码块（带语言标识符如```python）和粗体文本
    4. 包含实际的oTree代码示例和最佳实践
    5. 结论部分，总结关键要点

    内容要求：
    - 使用简体中文撰写
    - 包含实用的oTree代码示例
    - 提供具体的操作步骤
    - 面向中文开发者的语言风格
    - 不要包含任何前言如"当然，这是您的博客文章..."，直接返回原始Markdown内容

    请确保内容专业、准确且实用。
    """

    response = model.generate_content(prompt)
    return response.text

def save_post(topic, content):
    """Saves the generated content to a new markdown file in the src/content/blog directory."""
    # Create a URL-friendly slug from the topic
    # Handle Chinese characters properly
    slug = re.sub(r'[【】\[\]（）\(\)：:：、，,。.！!？?]', '', topic.lower())
    slug = re.sub(r'\s+', '-', slug).strip('-')
    # Keep only alphanumeric characters and hyphens
    slug = re.sub(r'[^\w\-]', '', slug)
    
    # Get today's date
    today = datetime.now().strftime("%Y-%m-%d")
    filename = f"{slug}.md"
    filepath = os.path.join(POSTS_DIR, filename)

    # Astro content collection front matter format
    front_matter = f"""---
title: "{topic}"
description: "AI生成的{topic}技术文章"
image: "/images/blog-1.jpg"
date: {today}T05:00:00Z
draft: false
---

"""
    full_content = front_matter + content
    
    # Ensure directory exists
    os.makedirs(POSTS_DIR, exist_ok=True)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(full_content)
        
    print(f"Blog post saved to: {filepath}")
    return filepath

def update_plan_file(line_index, topic):
    """Updates the plan.md file to mark a topic as 'in-progress'."""
    with open(PLAN_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Mark the line as checked
    lines[line_index] = lines[line_index].replace("- [ ]", "- [x]", 1)

    with open(PLAN_FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Updated plan.md to mark '{topic}' as complete.")


# --- Main Execution ---
if __name__ == "__main__":
    topic, line_num = find_next_topic()
    if not topic:
        print("No new topics to process in plan.md. Exiting.")
    else:
        blog_content = generate_blog_post(topic)
        save_post(topic, blog_content)
        # We don't update the plan file here. We will let the PR action do it
        # based on the changes. But for local testing, you might call:
        # update_plan_file(line_num, topic)
