---
type: Repository guide
title: Rowan Liu Blog Engineering Wiki
description: Source-grounded engineering documentation for this Astro site, its Cloudflare Worker services, content pipeline, and deployment workflows.
tags: [documentation, astro, cloudflare, github-actions, operations]
---

# Scope

Maintain a concise engineering wiki for the `llccing/llccing.github.io` repository. The wiki is for the repository owner, coding agents, and future maintainers. It is not a public blog-content index and must not summarize individual posts, short stories, or daily digest entries.

# Evidence and accuracy

- Treat current source code, configuration, schemas, tests, and checked-in workflows as authoritative.
- Use `docs/` as historical or operational context only. When it conflicts with code, prefer code and label the historical document as stale when useful.
- Inspect Git history for the reason behind important boundaries, migrations, and workflow behavior.
- Ground important claims in repository-relative file paths and named routes, functions, or commands.
- Do not invent APIs, deployment behavior, authentication guarantees, or infrastructure that is not present in the repository.
- Mark uncertain or inferred behavior as `Needs confirmation` instead of presenting it as fact.
- Keep the current Chinese locale, Asia/Shanghai timezone, scheduled publishing margin, and Cloudflare-first production assumptions explicit.

# Required coverage

Create or maintain a small set of practical pages covering:

- `index.md`: a map of the wiki and the fastest starting path.
- Repository architecture: Astro 4, Tailwind, React islands, content collections, and shared layouts.
- Source map: where pages, components, utilities, scripts, workers, and data live.
- Content and publishing: schemas, draft/future filtering, translations, tags, RSS, search, and digest boundaries.
- Runtime and routes: static Astro routes, Cloudflare Worker routes, D1, Queue, Workers AI, and authentication flow.
- AI pipelines: digest generation, inline annotation jobs, model/provider configuration, and how these systems differ.
- Deployment and operations: Cloudflare Pages production, GitHub Pages rollback, build commands, environment variables, and failure recovery.
- Testing and validation: `pnpm` commands, worker checks, content checks, and the absence of a dedicated browser integration suite.
- A troubleshooting/runbook page with symptoms, likely ownership, first files to inspect, and safe validation commands.

# Boundaries

- Do not read or reproduce the contents of `src/content/blog/`, `src/content/short-stories/`, `src/content/originals/`, or `src/content/digest/`; document their schemas and routing instead.
- Do not turn `AGENTS.md` into a duplicate of the wiki. Its managed OpenWiki block should only point agents to the wiki entry points.
- Do not rewrite this file during normal updates. It is human-maintained scope and policy.
- Do not make broad refactors or modify application source files as part of documentation generation.
- Prefer 8 to 12 focused pages over many shallow pages. Avoid generic framework tutorials.
- Use Chinese prose where practical, while preserving code identifiers, paths, commands, route names, and configuration keys verbatim.
- Add Mermaid only when it materially clarifies a cross-system flow, and ensure every diagram is grounded in the source.

# Quality bar

Every page should help answer a concrete maintenance question: where to start, what owns a behavior, what changes together, or how to diagnose a failure. Include links between related wiki pages and to the relevant repository files. Keep generated prose concise and update only facts affected by repository changes.
