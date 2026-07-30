# Daily Blog Commit Workflow Guide

This guide explains how to establish and maintain a consistent daily commit workflow for your Astro blog.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Content Strategy](#content-strategy)
3. [Automation Options](#automation-options)
4. [Setup Instructions](#setup-instructions)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Option 1: Manual Daily Workflow (Recommended for Beginners)

```bash
# 1. Create a new blog post
pnpm run daily-post -- "Your Topic Here"

# 2. Edit the generated file in src/content/blog/

# 3. Preview your changes
pnpm run dev

# 4. Commit and push
git add src/content/blog/*.md
git commit -m "feat(blog): add daily post about [topic]"
git push
```

### Option 2: Automated with GitHub Actions

See [GitHub Actions Setup](#github-actions-setup) below.

---

## 📝 Content Strategy

### Recommended Content Types

#### 1. **Technical Notes** (`technical-note`)
- Short Angular/Astro/TypeScript insights
- Code snippets with explanations
- Problem-solution format
- Example: "Angular Signals vs Zone.js Performance Comparison"

#### 2. **Daily English Reading** (`daily-english-reading`)
- B2-level articles with Chinese translation
- Audio narration support
- Vocabulary highlights
- Follows your existing pattern

#### 3. **Learning Logs** (`learning-log`)
- Document what you learned today
- Include code examples
- Link to resources
- Personal reflections

#### 4. **Industry Commentary** (`industry-commentary`)
- Analysis of tech trends
- Tool comparisons
- Best practice discussions

### Weekly Theme Planning

Plan themes by week to reduce decision fatigue:

| Week | Focus Area | Examples |
|------|------------|----------|
| 1 | Angular Features | Signals, Dependency Injection, RxJS patterns |
| 2 | Web Performance | Optimization techniques, Core Web Vitals |
| 3 | English Learning | Tech vocabulary, industry articles |
| 4 | Project Updates | Progress on personal/professional projects |

---

## ⚙️ Automation Options

### Comparison Table

| Feature | GitHub Actions | Local Script | Windows Task Scheduler |
|---------|---------------|--------------|------------------------|
| **Setup Complexity** | Medium | Low | Medium |
| **Reliability** | High | Medium | High |
| **Cost** | Free (within limits) | Free | Free |
| **Control** | Limited | Full | Full |
| **Review Before Commit** | No* | Yes | Yes |
| **Requires Computer On** | No | Yes | Yes |
| **Best For** | Fully automated | Quality-focused | Semi-automated |

*\*Can be added with manual approval step*

### Recommendation

**For most users**: Use the local script with manual review
- Run `pnpm run daily-post` each morning
- Review and edit content
- Commit when satisfied
- This balances automation with quality control

**For advanced users**: GitHub Actions with PAT
- Fully automated
- Requires careful setup
- Best for template-based content

---

## 🔧 Setup Instructions

### Prerequisites

- Node.js 20+ installed
- pnpm installed globally
- Git configured with credentials
- (Optional) OpenAI API key for AI-generated content

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Configure Git Credentials

```bash
# Cache credentials to avoid repeated prompts
git config --global credential.helper wincred  # Windows
# or
git config --global credential.helper osxkeychain  # macOS
# or
git config --global credential.helper cache  # Linux (temporary)
```

### Step 3: Test the Daily Post Script

```bash
# Test with a sample topic
pnpm run daily-post -- "Test Post"

# Verify the file was created in src/content/blog/
```

### Step 4: Choose Your Automation Method

#### A. Manual Workflow (No Additional Setup)

Simply run the command daily:
```bash
pnpm run daily-post -- "Today's Topic"
```

#### B. GitHub Actions Setup

1. **Create a Personal Access Token (PAT)**:
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Generate new token (classic)
   - Select scopes: `repo` (full control of private repositories)
   - Copy the token

2. **Add Secrets to Repository**:
   ```
   Settings → Secrets and variables → Actions → New repository secret
   
   Name: BLOG_PAT
   Value: [your PAT token]
   
   Name: OPENAI_API_KEY (optional)
   Value: [your OpenAI API key]
   ```

3. **Enable the Workflow**:
   - The workflow file is already created at `.github/workflows/daily-blog-generator.yml`
   - It will run daily at 2 AM UTC (10 AM Beijing time)
   - You can also trigger it manually from the Actions tab

4. **Customize Schedule** (optional):
   Edit `.github/workflows/daily-blog-generator.yml`:
   ```yaml
   schedule:
     - cron: '0 2 * * *'  # Change this time
   ```
   
   Cron format: `minute hour day month weekday`
   - Runs in UTC, convert to your timezone

#### C. Windows Task Scheduler Setup

See detailed instructions in [docs/daily-commit-windows-setup.md](docs/daily-commit-windows-setup.md)

Quick version:
```powershell
# Create scheduled task (run PowerShell as Administrator)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-Command cd C:\Users\LiuRowanChunfeng\Projects\xinda\llccing.github.io; pnpm run daily-post -- 'Daily Post'"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "Daily Blog Post" -Action $action -Trigger $trigger
```

---

## 🎯 Best Practices

### 1. Content Quality

- **Use templates**: Files in `.templates/` directory provide structure
- **Keep drafts private**: Set `draft: true` until ready to publish
- **Preview before publishing**: Always run `pnpm run dev` to check formatting
- **Maintain consistency**: Use similar structure across posts

### 2. Time Management

- **Batch planning**: Spend 1-2 hours weekly planning topics
- **Time-box writing**: Limit to 30-45 minutes per post
- **Alternate difficulty**: Mix easy and challenging topics
- **Recycle content**: Update old posts instead of always creating new ones

### 3. Avoiding Burnout

- **It's okay to skip days**: Consistency matters more than perfection
- **Vary content types**: Don't write heavy technical posts every day
- **Set realistic goals**: Start with 3-4 posts per week, not 7
- **Track progress**: Use `docs/blog-topics-plan.md` to stay organized

### 4. Git Workflow

- **Descriptive commits**: Use conventional commit format
  ```bash
  feat(blog): add post about Angular signals
  fix(blog): correct code example in React hooks post
  docs(blog): update tags for better SEO
  ```
- **Review before pushing**: Always preview locally first
- **Use branches for major updates**: Keep main branch stable

### 5. SEO and Discoverability

- **Write compelling descriptions**: Under 160 characters
- **Use consistent tags**: See best practices document for tag taxonomy
- **Add alt text to images**: Improves accessibility
- **Internal linking**: Link to related posts

---

## 🐛 Troubleshooting

### Issue: Script fails with "pnpm not found"

**Solution**: Install pnpm globally
```bash
npm install -g pnpm
```

### Issue: Git asks for password repeatedly

**Solution**: Configure credential helper
```bash
git config --global credential.helper wincred  # Windows
```

### Issue: GitHub Actions workflow doesn't trigger

**Solutions**:
1. Check if workflow is enabled: Actions tab → Enable workflow
2. Verify PAT has correct permissions
3. Check workflow syntax: Actions tab → View recent runs
4. Ensure cron schedule is valid

### Issue: Build fails after adding new post

**Solutions**:
1. Check frontmatter syntax (YAML formatting)
2. Verify required fields: title, pubDatetime, description, tags
3. Run `pnpm run lint` to catch errors
4. Check image paths if using ogImage

### Issue: Posts not showing up

**Solutions**:
1. Check `draft: true` in frontmatter
2. Verify `pubDatetime` is not in the future
3. Rebuild site: `pnpm run build`
4. Clear browser cache

### Issue: AI generation fails

**Solutions**:
1. Verify OPENAI_API_KEY secret is set correctly
2. Check API quota/billing status
3. Script falls back to template mode automatically
4. Consider using template-only mode to save costs

---

## 📊 Monitoring Success

### Key Metrics to Track

1. **Consistency Rate**: Posts per week / Target posts per week
2. **Engagement**: Comments, shares, page views (check analytics)
3. **Writing Quality**: Self-assessment score (1-5) per post
4. **Learning Growth**: New topics covered monthly
5. **Enjoyment Level**: Are you still motivated?

### Monthly Review Checklist

- [ ] Review contribution graph for consistency
- [ ] Identify most popular posts (double down on those topics)
- [ ] Update topic plan for next month
- [ ] Refine templates based on usage
- [ ] Celebrate wins! 🎉

---

## 📚 Additional Resources

- [Best Practices Guide](docs/daily-commit-best-practices.md) - Detailed strategies
- [Windows Setup Guide](docs/daily-commit-windows-setup.md) - OS-specific instructions
- [Blog Topics Plan](docs/blog-topics-plan.md) - Track your progress
- [Astro Documentation](https://docs.astro.build/) - Framework reference
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit message standard

---

## 💬 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review error messages carefully
3. Search existing issues in the repository
4. Test with a simple example first
5. Ask for help with specific error details

---

## 🎉 Conclusion

Establishing a daily commit habit takes time. Start small, be consistent, and adjust based on what works for you. The tools provided here are meant to reduce friction, not replace your voice and expertise.

**Remember**: The goal is sustainable growth and learning, not perfect streaks. Happy blogging! 🚀
