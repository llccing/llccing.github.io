import type { DigestSource } from "./types";

export const DOMAIN_LABELS: Record<string, string> = {
  angular: "Angular",
  web: "Web / 框架",
  ai: "AI",
  fullstack: "全栈 / 运行时",
};

export const SOURCES: DigestSource[] = [
  { id: "angular-releases", domain: "angular", label: "Angular releases", type: "github-releases", repo: "angular/angular", prereleases: true, lookbackDays: 14, maxPerRun: 4 },
  { id: "angular-blog", domain: "angular", label: "Angular blog", type: "rss", url: "https://blog.angular.dev/feed", lookbackDays: 21, maxPerRun: 3 },
  { id: "vue-core-releases", domain: "web", label: "Vue core releases", type: "github-releases", repo: "vuejs/core", prereleases: true, lookbackDays: 14, maxPerRun: 3 },
  { id: "react-releases", domain: "web", label: "React releases", type: "github-releases", repo: "facebook/react", lookbackDays: 14, maxPerRun: 3 },
  { id: "vite-releases", domain: "web", label: "Vite releases", type: "github-releases", repo: "vitejs/vite", include: "^v\\d", prereleases: true, lookbackDays: 14, maxPerRun: 3 },
  { id: "chrome-blog", domain: "web", label: "Chrome for Developers", type: "rss", url: "https://developer.chrome.com/static/blog/feed.xml", lookbackDays: 7, maxPerRun: 3 },
  { id: "openai-news", domain: "ai", label: "OpenAI news", type: "rss", url: "https://openai.com/news/rss.xml", lookbackDays: 5, maxPerRun: 2 },
  { id: "simon-willison", domain: "ai", label: "Simon Willison", type: "rss", url: "https://simonwillison.net/atom/everything/", exclude: "^(Quoting |Sighting )", lookbackDays: 3, maxPerRun: 3 },
  { id: "vercel-ai-sdk-releases", domain: "ai", label: "Vercel AI SDK releases", type: "github-releases", repo: "vercel/ai", include: "^ai@\\d", lookbackDays: 7, maxPerRun: 2 },
  { id: "node-releases", domain: "fullstack", label: "Node.js releases", type: "github-releases", repo: "nodejs/node", lookbackDays: 14, maxPerRun: 3 },
  { id: "bun-releases", domain: "fullstack", label: "Bun releases", type: "github-releases", repo: "oven-sh/bun", lookbackDays: 14, maxPerRun: 2 },
  { id: "cloudflare-blog", domain: "fullstack", label: "Cloudflare blog", type: "rss", url: "https://blog.cloudflare.com/rss/", lookbackDays: 4, maxPerRun: 2 },
  { id: "infoq-java", domain: "fullstack", label: "InfoQ Java", type: "rss", url: "https://feed.infoq.com/java/", exclude: "^(Presentation|Podcast|Article):", lookbackDays: 10, maxPerRun: 2 },
];

export const MAX_PER_DOMAIN = 10;
