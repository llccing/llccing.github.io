export type ProjectStatus = "active" | "exploring" | "archived";

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  status: ProjectStatus;
  statusLabel: string;
  year: string;
  featured: boolean;
  accent: "cyan" | "green" | "red" | "yellow" | "blue";
  image?: string;
  imageAlt?: string;
  technologies: string[];
  overview: string;
  challenge: string;
  approach: string[];
  outcome: string;
  links: ProjectLink[];
}

export const projects: Project[] = [
  {
    slug: "fashion-ai-workbench",
    title: "Fashion AI Workbench",
    kicker: "AI-native full-stack foundation",
    summary:
      "A Bun-first workspace for building type-safe AI products with provider switching, streaming responses and production-shaped infrastructure.",
    status: "active",
    statusLabel: "In development",
    year: "2026",
    featured: true,
    accent: "red",
    image: "/assets/projects/fashion-ai-console.png",
    imageAlt:
      "Fashion AI Console showing infrastructure status and the chat workbench",
    technologies: ["Next.js 16", "Bun", "tRPC", "Drizzle", "Vercel AI SDK"],
    overview:
      "Fashion AI Workbench is a Turborepo that turns a broad AI product idea into an executable engineering foundation. It connects a Next.js interface to a shared type-safe API, relational storage, caching and multiple model providers.",
    challenge:
      "AI prototypes often stop at a chat screen. This project explores how to preserve fast experimentation while keeping data contracts, infrastructure and provider boundaries explicit enough for a real product.",
    approach: [
      "Centralized the tRPC router so server and client consumers share one contract.",
      "Isolated model selection behind a provider layer for Ollama, OpenAI and DeepSeek.",
      "Kept PostgreSQL, Redis and local Ollama available through one development stack.",
      "Added workspace-wide lint, typecheck and test tasks through Turborepo and CI.",
    ],
    outcome:
      "The repository is a reusable, runnable base for AI workflows rather than a disconnected collection of demos. The next product milestone is validating a focused fashion workflow on top of it.",
    links: [
      {
        label: "View repository",
        href: "https://github.com/llccing/fashion-tech-stack",
      },
    ],
  },
  {
    slug: "rowan-blog",
    title: "Rowan's Blog",
    kicker: "Writing, research and web infrastructure",
    summary:
      "A long-running personal publishing system with technical writing, daily research digests, annotations and an evolving Cloudflare delivery stack.",
    status: "active",
    statusLabel: "Live",
    year: "2016–now",
    featured: true,
    accent: "cyan",
    image: "/assets/projects/rowan-blog.png",
    imageAlt: "Rowan's Blog home page with featured and recent articles",
    technologies: ["Astro", "TypeScript", "Cloudflare", "D1", "GitHub Actions"],
    overview:
      "The site is both a public notebook and a continuously maintained software product. It combines a large article archive with automated technical digests, full-text search, audio experiments and reader annotations.",
    challenge:
      "A personal site accumulates content and infrastructure over years. The work is less about a one-time redesign and more about preserving URLs, publishing reliability and readability while the system changes underneath.",
    approach: [
      "Migrated the presentation layer to Astro while preserving the existing content archive.",
      "Built a scheduled digest pipeline that turns selected sources into publishable Markdown.",
      "Added same-origin annotation APIs backed by Cloudflare Workers, D1 and Durable Objects.",
      "Kept build checks and deployment verification part of the publishing workflow.",
    ],
    outcome:
      "The site remains the primary public entry point for writing and shipped work. This projects section is the next step in consolidating that identity under rowanliu.com.",
    links: [
      { label: "Visit site", href: "https://rowanliu.com" },
      {
        label: "View repository",
        href: "https://github.com/llccing/llccing.github.io",
      },
    ],
  },
  {
    slug: "lingualeap",
    title: "LinguaLeap",
    kicker: "Language learning exploration",
    summary:
      "An early product exploration around language learning, built to test how guided practice and an AI-assisted interface can fit together.",
    status: "exploring",
    statusLabel: "Prototype",
    year: "2025",
    featured: false,
    accent: "green",
    technologies: ["Next.js", "TypeScript", "Firebase", "AI"],
    overview:
      "LinguaLeap is an early-stage language learning experiment. It is preserved as a record of product exploration rather than presented as a finished service.",
    challenge:
      "The central question was whether AI guidance could make short learning sessions feel directed instead of becoming another open-ended chat interface.",
    approach: [
      "Used a web-first prototype to reduce the cost of testing the learning flow.",
      "Explored Firebase-backed product scaffolding and AI-assisted interaction patterns.",
      "Kept the repository public so the implementation history remains inspectable.",
    ],
    outcome:
      "The project clarified the difference between an AI feature and a repeatable learning loop. It is currently archived while more grounded education work is evaluated elsewhere.",
    links: [
      {
        label: "View repository",
        href: "https://github.com/llccing/LinguaLeap",
      },
    ],
  },
  {
    slug: "mobile-ai-learning",
    title: "Mobile AI Learning",
    kicker: "Cross-platform application experiment",
    summary:
      "A paired React Native client and Cloudflare Worker backend exploring an AI-assisted mobile learning experience.",
    status: "archived",
    statusLabel: "Archived experiment",
    year: "2025",
    featured: false,
    accent: "blue",
    technologies: ["React Native", "Expo", "Cloudflare Workers", "D1"],
    overview:
      "This experiment spans two public repositories: a cross-platform mobile client and a small edge backend. They are presented together because they form one product attempt.",
    challenge:
      "The experiment tested whether a mobile AI interaction had enough product structure to justify a dedicated app instead of a responsive website.",
    approach: [
      "Built the interaction surface with React Native and Expo.",
      "Separated server concerns into a Cloudflare Worker with D1 persistence.",
      "Kept the client and API independently deployable while treating them as one case study.",
    ],
    outcome:
      "The work is retained as an architectural and product-learning artifact. It is not under active development, and the public repositories document its current boundary.",
    links: [
      { label: "View app", href: "https://github.com/llccing/the-app" },
      {
        label: "View API",
        href: "https://github.com/llccing/the-app-server",
      },
    ],
  },
  {
    slug: "otree-tools-archive",
    title: "oTree Tools Archive",
    kicker: "Experimental research infrastructure",
    summary:
      "A selected archive of browser tooling, experiment templates and an information site built around the oTree research platform.",
    status: "archived",
    statusLabel: "Archived",
    year: "2025–2026",
    featured: true,
    accent: "yellow",
    image: "/assets/projects/otree-tools.png",
    imageAlt: "Original oTree service site banner",
    technologies: [
      "oTree",
      "Astro",
      "Chrome Extension",
      "Python",
      "Cloudflare",
    ],
    overview:
      "This page consolidates several public repositories from an earlier oTree service direction. The commercial direction is no longer active, but the tools remain useful evidence of deployment, automation and research-platform work.",
    challenge:
      "Running behavioral experiments involves more than writing an oTree app: researchers also need repeatable deployment, project navigation, experiment templates and clear operational documentation.",
    approach: [
      "Built a browser extension to reduce friction when moving between oTree Hub workflows and source code.",
      "Created a public site to organize service documentation and technical material.",
      "Published a risk-preference experiment as a concrete, inspectable oTree example.",
      "Archived the direction explicitly when technical maturity did not produce sustainable demand.",
    ],
    outcome:
      "The service is no longer marketed. The public pieces are preserved as one honest case study, while private deployment infrastructure stays out of the portfolio.",
    links: [
      {
        label: "Browser extension",
        href: "https://github.com/The-Three-Fish/otree-chrome-extension",
      },
      {
        label: "Project site",
        href: "https://github.com/The-Three-Fish/the-three-fish.github.io",
      },
      {
        label: "Risk experiment",
        href: "https://github.com/The-Three-Fish/risk_preferences",
      },
    ],
  },
];

export function getProject(slug: string) {
  return projects.find(project => project.slug === slug);
}
