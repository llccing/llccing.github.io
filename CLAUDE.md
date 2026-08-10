# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rowan's Blog — a personal blog built with Astro. The site is deployed to GitHub Pages at [rowanliu.com](https://rowanliu.com) and documents thoughts, learnings, and experiences in software development and beyond.

## Tech Stack

- **Framework**: Astro 4.2.1
- **Language**: TypeScript
- **Styling**: TailwindCSS 3.4.1
- **Interactive Components**: React 18.2
- **Package Manager**: pnpm@10.28.0
- **Content Format**: Markdown with frontmatter
- **Image Processing**: Satori + Sharp (for OG image generation)
- **Markdown Plugins**: remark-toc, remark-collapse, custom remark-reading-time

## Development Commands

```bash
# Start development server (accessible on network via --host)
pnpm run dev

# Build for production (runs type check, build, and optimization)
pnpm run build

# Preview production build locally
pnpm preview

# Lint code with ESLint
pnpm lint

# Check formatting with Prettier
pnpm run format:check

# Auto-format code with Prettier
pnpm run format

# Create a commit with conventional commit message (interactive)
pnpm run cz
```

## Project Structure

```
src/
├── pages/              # File-based routing (Astro pages)
│   ├── posts/[slug]/   # Dynamic blog post routes
│   ├── tags/[tag]/     # Tag-based post filtering
│   ├── short-stories/  # Short story collection routes
│   ├── radio/          # Radio player page
│   └── search.astro    # Full-text search page
├── content/            # Content collections (Astro Content Collections API)
│   ├── blog/           # Blog posts (organized by category: backend, frontend, english)
│   ├── short-stories/  # Short story markdown files
│   └── originals/      # Original content pieces
├── components/         # Reusable Astro and React components
│   ├── *.astro         # Astro components (server-rendered)
│   ├── *.tsx           # React components (interactive)
│   └── Comments.tsx    # Giscus comments integration
├── layouts/            # Astro layout templates
│   ├── Layout.astro    # Main layout wrapper
│   └── PostDetails.astro # Post template with metadata
├── utils/              # Utility functions
│   ├── getSortedPosts.ts
│   ├── generateOgImages.tsx # OG image generation
│   ├── remark-reading-time.ts # Custom remark plugin
│   └── og-templates/   # Satori templates for OG images
├── data/               # Static data files
│   ├── radio-data.ts   # Radio player data
│   └── company-data.ts # Portfolio company data
├── config.ts           # Site configuration (SITE, LOCALE, SOCIALS)
└── types.ts            # TypeScript type definitions
```

## Key Architecture Details

### Content Collections
- Posts are stored as markdown files with frontmatter (title, pubDatetime, modDatetime, description, author, tags, ogImage, etc.)
- Three main collections: `blog`, `short-stories`, `originals`
- Blog posts are organized by category (e.g., `src/content/blog/backend/`, `src/content/blog/frontend/`)
- Astro's Content Collections API handles validation and type safety

### Post Processing
- **Reading Time**: Custom remark plugin (`remark-reading-time`) calculates and injects reading time into post frontmatter
- **Table of Contents**: `remark-toc` plugin auto-generates TOC from headings
- **Collapsible Sections**: `remark-collapse` plugin collapses the TOC by default
- **Syntax Highlighting**: Shiki with "one-dark-pro" theme

### OG Image Generation
- Dynamic OG images are generated at build time using Satori (HTML/CSS to SVG)
- Templates in `src/utils/og-templates/` define the visual layout
- Sharp converts SVG to PNG
- Images are generated per post and stored in `dist/`

### Markdown Syntax
- Posts use standard Markdown with frontmatter (YAML)
- Code blocks with language syntax highlighting (e.g., \`\`\`typescript)
- Frontmatter schema validated by `src/content/config.ts`

### Site Configuration
- `src/config.ts` contains global site settings (SITE.website, SITE.title, LOCALE, SOCIALS)
- Posts per page: 10 (configurable via SITE.postPerPage)
- Timezone: Asia/Shanghai (UTC+8) — set in astro.config.ts
- Light/dark mode toggle enabled

### Utilities for Post Management
- `getSortedPosts()` — sorts posts by publication date (newest first)
- `getUniqueTags()` — extracts all unique tags from posts
- `getPostsByTag()` — filters posts by tag
- `postFilter()` — filters posts (e.g., published, scheduled)
- `getPagination()` / `getPageNumbers()` — handles pagination logic

## Code Quality & Formatting

**ESLint**:
- Extends `eslint:recommended` and `plugin:astro/recommended`
- Custom rules for Astro files using `astro-eslint-parser`
- Run with `pnpm lint`

**Prettier**:
- Configured with Astro plugin (`prettier-plugin-astro`)
- TailwindCSS class sorting plugin (`prettier-plugin-tailwindcss`)
- Run `pnpm run format` to auto-format

**Git Hooks**:
- Husky pre-commit hooks run Prettier and ESLint on staged files
- Use `pnpm run cz` to create commits with conventional commit format

## Deployment

The site is deployed to GitHub Pages via GitHub Actions:
- Workflow file: `.github/workflows/deploy.yml`
- Triggers on push to `main` branch
- Runs: dependency install → type check → build → optimize → deploy to gh-pages branch
- Custom domain: rowanliu.com (via CNAME in deploy step)
- Build output directory: `dist/`

## Special Notes

1. **Timezone**: All date processing uses Asia/Shanghai (UTC+8). This is set globally in `astro.config.ts`.
2. **Scheduled Posts**: Posts can be scheduled to publish in the future. Margin configured as 15 minutes (`scheduledPostMargin`).
3. **Post Slug Generation**: Slugs are auto-generated from post filenames; use kebab-case for consistency.
4. **Image Optimization**: Astro handles image optimization; use passthrough service for flexibility.
5. **Blog Translator Agent**: Custom agent in `.github/agents/blog-translator.agent.md` for translating blog content.

## Common Development Tasks

**Adding a new blog post**:
1. Create markdown file in `src/content/blog/{category}/{slug}.md`
2. Include required frontmatter: title, pubDatetime, description, tags, author
3. Write content in Markdown
4. Run `pnpm run dev` to preview
5. Commit with `pnpm run cz` when ready

**Modifying styling**:
- TailwindCSS classes are preferred
- Base styles in `src/styles/base.css`
- Scoped styles in components use `scoped` strategy (see astro.config.ts)

**Adding interactive components**:
- Use React (`*.tsx`) for interactive features
- Astro components (`.astro`) for server-rendered static markup
- Keep React components simple and focused

**Updating site metadata**:
- Edit `src/config.ts` for site-wide settings
- Update `src/content/config.ts` for frontmatter schema changes

<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

OpenWiki is currently a local/manual documentation trial; no scheduled workflow is enabled. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
