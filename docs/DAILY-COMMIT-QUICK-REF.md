# Daily Blog Post - Quick Reference Card

## 🚀 One-Command Workflow

```bash
pnpm run daily-post -- "Your Topic Here"
```

## 📋 Daily Checklist

- [ ] **Morning**: Run `pnpm run daily-post -- "Topic"`
- [ ] **Edit**: Open generated file in `src/content/blog/`
- [ ] **Preview**: Run `pnpm run dev` and check localhost:4321
- [ ] **Commit**: Script prompts you to commit
- [ ] **Push**: Script prompts you to push (or do it manually)
- [ ] **Track**: Update `docs/blog-topics-plan.md`

## 📝 Content Types

### Technical Note
```bash
pnpm run daily-post -- --type=technical-note "Angular Signals Guide"
```

**Structure**:
- Introduction (why it matters)
- Key concepts
- Code examples
- Practical application
- Summary

### English Reading
```bash
pnpm run daily-post -- --type=daily-english-reading "AI Technology"
```

**Structure**:
- English article (800-1000 words)
- Chinese translation
- Audio player
- Vocabulary list
- Study tips

## 🏷️ Tag Suggestions

**Technical**: Angular, React, TypeScript, JavaScript, CSS, HTML, Node.js, Astro, Performance, Security

**Content Type**: Tutorial, Guide, Tips, Best Practices, Daily Reading, English Learning, Project Log

**Topics**: AI, Web Dev, Frontend, Backend, DevOps, Testing, Accessibility

## 💡 Quick Tips

### When You're Busy
- Keep it short (200-300 words minimum)
- Use a template
- Focus on one key point
- Set `draft: true` and finish later

### When You Have Time
- Write a deep dive
- Add code examples
- Include diagrams/screenshots
- Link to related posts

### Writing Prompts
1. What did I learn today?
2. What problem did I solve?
3. What tool/library did I explore?
4. What mistake did I make and what did I learn?
5. What trend am I noticing in the industry?

## 🔧 Common Commands

```bash
# Create post
pnpm run daily-post -- "Topic"

# Preview site
pnpm run dev

# Build and check for errors
pnpm run build

# Format code
pnpm run format

# Lint files
pnpm run lint

# Commit with conventional format
pnpm run cz
```

## ⚠️ Before Publishing

- [ ] Check spelling and grammar
- [ ] Verify all links work
- [ ] Test code examples
- [ ] Ensure images load correctly
- [ ] Preview on mobile view
- [ ] Set `draft: false` when ready

## 🎯 Success Formula

**Consistency > Perfection**

- 3-4 good posts per week > 7 rushed posts
- Regular schedule builds audience
- Quality improves over time
- Enjoy the process!

---

**Need Help?** See [docs/daily-commit-workflow.md](daily-commit-workflow.md) for complete guide.
