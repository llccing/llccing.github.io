export const ANNOTATION_MARKER = "rowan-annotation:v1";
export const AI_REPLY_MARKER = "rowan-ai-reply:v1";

export const COMMENT_LIMITS = {
  body: 8_000,
  exact: 1_200,
  context: 240,
  articleTitle: 200,
} as const;

export type CommentView = "article" | "translated" | "original";

export type AnnotationAnchor = {
  blockId: string;
  headingId: string | null;
  exact: string;
  prefix: string;
  suffix: string;
  view: CommentView;
};

export type AnnotationMetadata = {
  version: 1;
  path: string;
  anchor: AnnotationAnchor;
};

export type CommentAuthor = {
  login: string;
  avatarUrl: string;
  url: string;
};

export type CommentReply = {
  id: string;
  bodyHtml: string;
  bodyText: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
};

export type AnnotationThread = {
  id: string;
  url: string;
  bodyHtml: string;
  bodyText: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  anchor: AnnotationAnchor;
  replies: CommentReply[];
};

export type CommentListResponse = {
  version: number;
  discussion: null | {
    id: string;
    number: number;
    title: string;
    url: string;
  };
  threads: AnnotationThread[];
  truncated: boolean;
};

export type CommentMutationResponse = {
  version: number;
  thread?: AnnotationThread;
  reply?: CommentReply & { annotationId: string };
};

export type CreateCommentInput = {
  path: string;
  articleTitle: string;
  body: string;
  anchor?: AnnotationAnchor;
  replyToId?: string;
};

const MARKER_RE = /<!--\s*rowan-annotation:v1\s+([A-Za-z0-9_-]+)\s*-->/;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export function normalizeArticlePath(value: string): string | null {
  let path: string;
  try {
    path = new URL(value, "https://rowanliu.com").pathname;
  } catch {
    return null;
  }

  const normalized = `/${path.replace(/^\/+|\/+$/g, "")}/`;
  if (!/^\/(posts|short-stories)\/[a-z0-9][a-z0-9-]*\/$/.test(normalized)) {
    return null;
  }
  return normalized;
}

export function isAnnotationAnchor(value: unknown): value is AnnotationAnchor {
  if (!value || typeof value !== "object") return false;
  const anchor = value as Record<string, unknown>;
  return (
    typeof anchor.blockId === "string" &&
    anchor.blockId.length > 0 &&
    anchor.blockId.length <= 180 &&
    (anchor.headingId === null ||
      (typeof anchor.headingId === "string" &&
        anchor.headingId.length <= 180)) &&
    typeof anchor.exact === "string" &&
    anchor.exact.length > 0 &&
    anchor.exact.length <= COMMENT_LIMITS.exact &&
    typeof anchor.prefix === "string" &&
    anchor.prefix.length <= COMMENT_LIMITS.context &&
    typeof anchor.suffix === "string" &&
    anchor.suffix.length <= COMMENT_LIMITS.context &&
    (anchor.view === "article" ||
      anchor.view === "translated" ||
      anchor.view === "original")
  );
}

export function isAnnotationMetadata(
  value: unknown
): value is AnnotationMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as Record<string, unknown>;
  return (
    metadata.version === 1 &&
    typeof metadata.path === "string" &&
    normalizeArticlePath(metadata.path) === metadata.path &&
    isAnnotationAnchor(metadata.anchor)
  );
}

export function serializeAnnotationMarker(
  metadata: AnnotationMetadata
): string {
  if (!isAnnotationMetadata(metadata)) {
    throw new Error("Invalid annotation metadata");
  }
  const encoded = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(metadata))
  );
  return `<!-- ${ANNOTATION_MARKER} ${encoded} -->`;
}

export function parseAnnotationMetadata(
  body: string
): AnnotationMetadata | null {
  const match = body.match(MARKER_RE);
  if (!match) return null;
  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(match[1]));
    const parsed: unknown = JSON.parse(decoded);
    return isAnnotationMetadata(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function stripAnnotationMarker(body: string): string {
  return body.replace(MARKER_RE, "").trim();
}

export function extractAnnotationText(body: string): string {
  const withoutMarker = stripAnnotationMarker(body);
  const lines = withoutMarker.split("\n");
  let offset = 0;
  while (offset < lines.length && lines[offset].trim().startsWith(">")) {
    offset += 1;
  }
  while (offset < lines.length && lines[offset].trim() === "") {
    offset += 1;
  }
  return lines.slice(offset).join("\n").trim();
}

export function buildAnnotationCommentBody(
  metadata: AnnotationMetadata,
  body: string
): string {
  const trimmedBody = body.trim();
  if (!trimmedBody || trimmedBody.length > COMMENT_LIMITS.body) {
    throw new Error("Comment body is empty or too long");
  }
  const quote = metadata.anchor.exact
    .trim()
    .split("\n")
    .map(line => `> ${line}`)
    .join("\n");
  return `${serializeAnnotationMarker(metadata)}\n\n${quote}\n\n${trimmedBody}`;
}

export function extractSameSiteArticlePaths(text: string): string[] {
  const matches = text.matchAll(
    /(?:https?:\/\/(?:www\.)?rowanliu\.com)?\/(posts|short-stories)\/([a-z0-9][a-z0-9-]*)\/?/gi
  );
  const paths = new Set<string>();
  for (const match of matches) {
    const path = normalizeArticlePath(`/${match[1]}/${match[2]}/`);
    if (path) paths.add(path);
    if (paths.size === 3) break;
  }
  return [...paths];
}
