# Portfolio component plan

The requested target stack was Next.js + Tailwind CSS + Framer Motion. This repository is currently an Astro 4 blog with Tailwind and React islands, so the implementation keeps the same component boundaries but adapts them to Astro instead of converting the whole site to Next.js.

## JSON data source

- `src/data/portfolio.resume.json`

This file stores profile, design tokens, skills, experiences, projects and the planned component mapping. It is intentionally content-first so the resume can later be extended from a pasted Resume.docx export without rewriting UI code.

## Next.js target structure

If this portfolio is later extracted to a Next.js app, use:

- `app/portfolio/page.tsx`
- `components/portfolio/PortfolioHero.tsx`
- `components/portfolio/ExperienceCard.tsx`
- `components/portfolio/ExperienceModal.tsx`
- `components/portfolio/TechGlyph.tsx`
- `data/resume.json`

## Current Astro implementation

- `src/pages/portfolio.astro`
- `src/components/portfolio/PortfolioExperience.tsx`
- `src/data/portfolio.resume.json`

`PortfolioExperience.tsx` is a React island using Framer Motion for:

- `layoutId` shared-layout card-to-modal transitions
- card hover lift
- magnetic cursor tilt through motion values and springs
- modal enter/exit animation with `AnimatePresence`

## Design direction

- Tech Minimalism: soft Sean Halpin-like background, big rounded cards and lots of whitespace
- Programmer-native 2D visuals: terminal, code snippet and abstract learning blocks
- Progressive disclosure: one-line summaries on the page, deep technical details in modal cards
