# Best Practices for Daily Blog Committing

## 📅 Content Planning Strategy

### Weekly Theme Approach
Instead of random daily posts, organize by weekly themes:

| Week | Theme | Content Types |
|------|-------|---------------|
| Week 1 | Angular Deep Dive | Technical notes, code snippets, version comparisons |
| Week 2 | English Learning | Daily reading articles with audio |
| Week 3 | Web Development Trends | Industry analysis, tool comparisons |
| Week 4 | Personal Projects | Progress updates, lessons learned |

### Content Batching
- **Spend 2-3 hours on weekends** planning the week's topics
- **Create outlines** for all 7 posts
- **Gather resources** (links, code examples, images) in advance
- This reduces daily decision fatigue significantly

---

## 🏗️ File Structure Organization

### Recommended Directory Structure
```
src/content/blog/
├── 2026-06/
│   ├── daily-english-reading-2026-06-15-ai-trends.md
│   ├── daily-technical-note-2026-06-16-angular-signals.md
│   └── daily-learning-log-2026-06-17-docker-basics.md
├── 2026-07/
│   └── ...
```

**Note**: Your current flat structure works fine too. The key is consistent naming.

### Naming Convention
Use this pattern for easy sorting and filtering:
```
{type}-{YYYY-MM-DD}-{slug}.md

Examples:
- daily-english-reading-2026-06-17-quantum-computing.md
- technical-note-2026-06-18-react-hooks.md
- learning-log-2026-06-19-rust-basics.md
```

---

## ⚡ Avoiding Burnout

### 1. Set Realistic Expectations
- **Not every post needs to be perfect** - some can be short notes
- **Quality over quantity** - it's okay to skip a day if needed
- **Mix content types** - alternate between heavy technical posts and lighter reflections

### 2. Time Management
- **Limit writing time to 30-45 minutes per day**
- Use templates (provided in `.templates/` folder)
- Don't aim for long-form essays daily - save those for weekly deep dives

### 3. Content Recycling
- **Expand on existing posts** - update older articles with new information
- **Series approach** - break complex topics into multi-day series
- **Curate and comment** - share interesting articles with your analysis

### 4. Use Drafts Strategically
```yaml
# In your frontmatter
draft: true  # Hide from public view until ready
```

Workflow:
1. Write as `draft: true`
2. Review and edit over 1-2 days
3. Change to `draft: false` when satisfied
4. Update `pubDatetime` to backdate if needed

---

## 🔄 Commit Message Conventions

Follow conventional commits for consistency:

```bash
# For new blog posts
feat(blog): add daily post about [topic]

# For updates
fix(blog): correct typos in [post-name]
docs(blog): update [post-name] with new examples

# For maintenance
chore(blog): reorganize blog directory structure
```

Your existing husky + commitizen setup supports this automatically:
```bash
pnpm run cz
```

---

## 📊 Tracking Progress

### Use Your Existing Plan Document
Update `docs/blog-topics-plan.md` regularly:

```markdown
## Daily Posts - June 2026

| Date | Topic | Status | Notes |
|------|-------|--------|-------|
| 2026-06-17 | AI in Healthcare | ✅ | Published |
| 2026-06-18 | React Server Components | 📝 | Draft ready |
| 2026-06-19 | TypeScript 5.5 Features | 💭 | Need research |
```

### GitHub Contribution Graph
- Consistent daily commits create a green contribution graph
- This serves as visual motivation
- But don't obsess over it - consistency matters more than perfection

---

## 🛠️ Automation Balance

### What to Automate
✅ File creation with templates  
✅ Frontmatter generation  
✅ Date stamping  
✅ Git add/commit (with review step)  

### What NOT to Automate
❌ Content quality control  
❌ Final editing and proofreading  
❌ Tag selection (requires context)  
❌ Publishing decision (use drafts)  

### Recommended Workflow
```
1. Script generates draft file → Automated
2. You review and edit content → Manual
3. Script commits changes → Automated (with confirmation)
4. You push when ready → Manual or automated
```

---

## 🎨 Content Quality Guidelines

### Minimum Viable Post
Even on busy days, aim for:
- **Title**: Clear and descriptive
- **Description**: 1-2 sentences summarizing the post
- **Body**: At least 200-300 words OR meaningful code example
- **Tags**: 2-3 relevant tags
- **No major errors**: Quick spell-check

### Ideal Post Structure
1. **Hook** (1 paragraph) - Why should readers care?
2. **Main content** (2-4 sections) - Core information
3. **Code examples** (if applicable) - Practical demonstrations
4. **Summary** (1 paragraph) - Key takeaways
5. **Next steps** (optional) - Links to related content

---

## 🔍 SEO and Discoverability

### Tags Strategy
Maintain a consistent tag taxonomy:

**Technical Tags:**
- Angular, React, Vue, TypeScript, JavaScript
- CSS, HTML, TailwindCSS
- Node.js, Astro, Next.js

**Content Type Tags:**
- Tutorial, Guide, Tips, Best Practices
- Daily Reading, English Learning
- Project Log, Case Study

**Topic Tags:**
- Performance, Security, Accessibility
- DevOps, CI/CD, Testing

### Description Optimization
- Keep under 160 characters (SEO best practice)
- Include primary keyword
- Make it compelling for click-through

---

## 🚀 Deployment Considerations

### Preview Before Publishing
```bash
# Always preview locally first
pnpm run dev

# Check for build errors
pnpm run build
```

### Scheduled Publishing
Your site uses Asia/Shanghai timezone. Remember:
- Posts with future `pubDatetime` are hidden until that time
- Margin is controlled by `SITE.scheduledPostMargin` in config
- Test date-related behavior carefully

---

## 💡 Motivation Tips

### Build Habits, Not Streaks
- Focus on building a sustainable habit
- Missing one day is fine - just continue the next day
- Celebrate weekly completion, not just daily streaks

### Community Engagement
- Share your posts on social media
- Respond to comments (you have Giscus configured)
- Learn from reader feedback

### Track Your Growth
- Re-read posts from 3 months ago
- Notice improvement in writing and technical depth
- Use blog as personal knowledge base

---

## 📋 Quick Start Checklist

For each daily post:

- [ ] Choose topic (from weekly plan or inspiration)
- [ ] Run: `pnpm run daily-post -- "Topic Name"`
- [ ] Edit generated file in `src/content/blog/`
- [ ] Add relevant tags
- [ ] Write compelling description
- [ ] Preview locally: `pnpm run dev`
- [ ] Commit changes
- [ ] Push to repository
- [ ] Update topic plan document
- [ ] Share on social media (optional)

---

## 🎯 Success Metrics

Track these monthly:
1. **Consistency**: Days with commits / Total days
2. **Engagement**: Comments, shares, page views
3. **Quality**: Self-rating (1-5) per post
4. **Learning**: New concepts explored
5. **Enjoyment**: Are you still having fun?

Remember: The goal is sustainable growth, not perfection!
