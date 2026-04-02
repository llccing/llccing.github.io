# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "oTree Study" - an Astro-based static website for oTree development services. The site is built on the Bigspring Light theme template and uses Astro 4.3+ with React components, MDX for content, and Tailwind CSS for styling.

## Development Commands

### Setup
```bash
npm install          # Install dependencies (pnpm-lock.yaml exists but npm is used)
```

### Development
```bash
npm run dev          # Start dev server with --host flag
```

### Building
```bash
npm run build        # Build for production
npm run postbuild    # Automatically runs after build - copies .nojekyll to dist
```

### Code Formatting
```bash
npm run format       # Format code with Prettier
```

## Architecture

### Content Management (Astro Content Collections)

The site uses Astro's Content Collections API for type-safe content management. All content is defined in [src/content/](src/content/) with schemas in [src/content/config.ts](src/content/config.ts).

**Content Collections:**
- `blog/` - Blog posts (markdown/MDX files with frontmatter)
- `pages/` - Static pages
- `homepage/`, `contact/`, `faq/`, `pricing/` - Structured data collections (currently commented out in config.ts but directories exist)

**Note:** The config.ts file has several collections commented out (homepage, contact, faq, pricing). If working with these collections, uncomment the relevant schema definitions and exports.

### Configuration System

All site configuration is centralized in [src/config/](src/config/):

- [config.json](src/config/config.json) - Site metadata, base URL, pagination, footer content
- [menu.json](src/config/menu.json) - Navigation structure (main header + footer menus)
- [social.json](src/config/social.json) - Social media links
- [theme.json](src/config/theme.json) - Colors, fonts, and theme customization

The Tailwind config ([tailwind.config.js](tailwind.config.js)) dynamically reads from theme.json to generate design tokens.

### Layout System

Layouts follow a hierarchical structure in [src/layouts/](src/layouts/):

- [Base.astro](src/layouts/Base.astro) - Root HTML layout with meta tags, fonts, ViewTransitions
- [Default.astro](src/layouts/Default.astro) - Standard page wrapper
- [PostSingle.astro](src/layouts/PostSingle.astro) - Blog post layout
- [partials/](src/layouts/partials/) - Header, Footer, Post components
- [components/](src/layouts/components/) - Reusable components (Logo, Pagination, Share, Social, etc.)

### MDX Shortcodes (Auto-Imported)

React-based shortcodes in [src/layouts/shortcodes/](src/layouts/shortcodes/) are automatically imported into MDX files via astro-auto-import:

- `<Button>` - Call-to-action buttons
- `<Accordion>` - Collapsible content
- `<Notice>` - Alert/info boxes
- `<Video>` / `<Youtube>` - Video embeds
- `<Tabs>` / `<Tab>` - Tabbed content

These are configured in [astro.config.mjs](astro.config.mjs) under AutoImport and available in all MDX files without explicit imports.

### Path Aliases

Configured in [tsconfig.json](tsconfig.json):
- `@/*` → `src/*`
- `@/components/*` → `src/layouts/components/*`
- `@/shortcodes/*` → `src/layouts/shortcodes/*`
- `@/partials/*` → `src/layouts/partials/*`
- `@/helpers/*` → `src/layouts/helpers/*`

### Routing

Pages are in [src/pages/](src/pages/):
- `index.astro` - Homepage
- `blog/index.astro` - Blog listing
- `blog/[single].astro` - Dynamic blog post pages
- `blog/page/[slug].astro` - Paginated blog listing
- `[regular].astro` - Dynamic catch-all for content from pages collection
- Static routes: `contact.astro`, `faq.astro`, `pricing.astro`, `404.astro`

### Utilities

Helper functions in [src/lib/utils/](src/lib/utils/):
- `dateFormat.ts` - Date formatting
- `readingTime.ts` - Calculate reading time
- `similarItems.ts` - Find similar posts
- `sortFunctions.ts` - Content sorting
- `taxonomyFilter.ts` - Category/tag filtering

Content parsers in [src/lib/](src/lib/):
- `contentParser.astro` - Parse and render MDX content
- `taxonomyParser.astro` - Parse categories/tags

### Styling

- Tailwind CSS with custom configuration driven by [theme.json](src/config/theme.json)
- Main styles in [src/styles/main.scss](src/styles/main.scss)
- Responsive breakpoints: sm(540px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)
- Plugins: @tailwindcss/typography, @tailwindcss/forms, tailwind-bootstrap-grid

### Markdown Processing

Configured in [astro.config.mjs](astro.config.mjs):
- Remark plugins: `remark-toc` (table of contents), `remark-collapse` (collapsible TOC)
- Syntax highlighting: "one-dark-pro" theme with word wrap enabled

## Deployment

The site is configured for both Netlify and GitHub Pages:
- **Netlify:** [netlify.toml](netlify.toml) defines build command `yarn build` and security headers
- **GitHub Pages:** `.nojekyll` file is automatically copied to dist during build (see postbuild script)
- **Base URL:** Configured in config.json as `https://the-three-fish.github.io`

## Important Notes

1. **Content Schema Changes:** If modifying content collections in config.ts, ensure corresponding files in src/content/ match the schema structure.

2. **Theme Customization:** Colors, fonts, and design tokens should be modified in theme.json rather than directly in Tailwind config.

3. **Image Optimization:** Astro uses squooshImageService for image optimization (configured in astro.config.mjs).

4. **ViewTransitions:** The site uses Astro's View Transitions API for page navigation animations (enabled in Base.astro).

5. **Draft Content:** Both blog posts and pages support a `draft: true` frontmatter field to exclude content from production builds.

6. **Git Status:** Repository uses main branch for both development and deployment.
