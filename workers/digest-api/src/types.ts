export type DigestSource = {
  id: string;
  domain: string;
  label: string;
  type: "github-releases" | "rss";
  repo?: string;
  url?: string;
  include?: string;
  exclude?: string;
  prereleases?: boolean;
  lookbackDays?: number;
  maxPerRun?: number;
};

export type DigestItem = {
  id: string;
  url: string;
  rawName: string;
  title: string;
  publishedAt: string | null;
  summary: string;
  sourceId: string;
  sourceLabel: string;
  domain: string;
  maxPerRun?: number;
  lookbackDays?: number;
};

export type SourceFailure = { id: string; message: string; status?: number };

export type DigestJobPayload = {
  date: string;
  seenUrls: string[];
  runKey?: string;
};

export type DigestJobResult = {
  date: string;
  items: DigestItem[];
  failures: SourceFailure[];
  body: string;
  provider: "primary" | "fallback";
  model: string;
};
