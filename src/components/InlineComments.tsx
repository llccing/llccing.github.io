import {
  ExternalLink,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Reply,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  extractAnnotationText,
  stripAnnotationMarker,
  type AnnotationAnchor,
  type AnnotationThread,
  type CommentListResponse,
  type CommentView,
} from "../comments/protocol";
import { useCallback, useEffect, useMemo, useState } from "react";

const ANNOTATION_MODE_KEY = "rowan-comments-annotation-mode";
const BLOCK_SELECTOR = "[data-comment-block-id]";

type OwnerSession = {
  canWrite: true;
  login: string;
  csrfToken: string;
};

type PublicSession = { canWrite: false };

type Props = {
  apiUrl: string;
  articlePath: string;
  articleTitle: string;
};

type PositionedBlock = {
  key: string;
  block: HTMLElement;
  top: number;
  left: number;
  count: number;
};

type ComposerState = {
  anchor?: AnnotationAnchor;
  replyToId?: string;
  editId?: string;
  initialBody?: string;
};

function blockView(block: HTMLElement): CommentView {
  if (block.closest("#article-original")) return "original";
  if (block.closest("#article-translated")) return "translated";
  return "article";
}

function blockKey(block: HTMLElement): string {
  return `${blockView(block)}:${block.dataset.commentBlockId ?? ""}`;
}

function threadKey(thread: AnnotationThread): string {
  return `${thread.anchor.view}:${thread.anchor.blockId}`;
}

function cleanBlockText(block: HTMLElement): string {
  const clone = block.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(".heading-link, .copy-code")
    .forEach(node => node.remove());
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

function readableReply(body: string): string {
  return stripAnnotationMarker(body)
    .replace(/<!--\s*rowan-ai-reply:v1(?:\s+[^>]*)?\s*-->/g, "")
    .trim();
}

function RichText({ text }: { text: string }) {
  const parts = text.split(
    /(https?:\/\/[^\s<]+|\/(?:posts|short-stories)\/[a-z0-9-]+\/?)/gi
  );
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-6">
      {parts.map((part, index) => {
        if (!/^(?:https?:\/\/|\/(?:posts|short-stories)\/)/i.test(part)) {
          return <span key={index}>{part}</span>;
        }
        const external =
          /^https?:\/\//i.test(part) &&
          !/^https?:\/\/(?:www\.)?rowanliu\.com/i.test(part);
        return (
          <a
            className="underline decoration-dashed underline-offset-4 hover:text-skin-accent"
            href={part}
            key={index}
            rel={external ? "noreferrer" : undefined}
            target={external ? "_blank" : undefined}
          >
            {part}
          </a>
        );
      })}
    </p>
  );
}

function IconButton({
  label,
  children,
  danger = false,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-skin-line bg-skin-fill transition-colors hover:border-skin-accent hover:text-skin-accent ${danger ? "hover:!border-red-600 hover:!text-red-600" : ""}`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export default function InlineComments({
  apiUrl,
  articlePath,
  articleTitle,
}: Props) {
  const endpoint =
    window.location.origin === "https://rowanliu.com"
      ? ""
      : apiUrl.replace(/\/$/, "");
  const [ownerMode, setOwnerMode] = useState(() => {
    const deepLink =
      new URLSearchParams(window.location.search).get("annotate") === "1";
    if (deepLink) localStorage.setItem(ANNOTATION_MODE_KEY, "true");
    return deepLink || localStorage.getItem(ANNOTATION_MODE_KEY) === "true";
  });
  const [threads, setThreads] = useState<AnnotationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ownerSession, setOwnerSession] = useState<OwnerSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [positions, setPositions] = useState<PositionedBlock[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<HTMLElement | null>(null);
  const [selectionAnchor, setSelectionAnchor] =
    useState<AnnotationAnchor | null>(null);
  const [selectionPosition, setSelectionPosition] = useState({
    top: 0,
    left: 0,
  });
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const headers = new Headers(init.headers);
      if (init.body) headers.set("Content-Type", "application/json");
      if (init.method && init.method !== "GET" && ownerSession?.csrfToken) {
        headers.set("X-CSRF-Token", ownerSession.csrfToken);
      }
      const response = await fetch(`${endpoint}${path}`, {
        ...init,
        credentials: "include",
        headers,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(
          payload?.error?.message ?? `请求失败 (${response.status})`
        );
      }
      return (response.status === 204 ? null : await response.json()) as T;
    },
    [endpoint, ownerSession]
  );

  const reload = useCallback(async () => {
    try {
      setError("");
      const data = await request<CommentListResponse>(
        `/api/comments?path=${encodeURIComponent(articlePath)}`
      );
      setThreads(data.threads);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "批注加载失败");
    } finally {
      setLoading(false);
    }
  }, [articlePath, request]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    fetch(`${endpoint}/api/owner/session`, {
      credentials: "include",
    })
      .then(async response => {
        if (!response.ok) throw new Error("session check failed");
        const session = (await response.json()) as OwnerSession | PublicSession;
        setOwnerSession(session.canWrite ? session : null);
      })
      .catch(() => setOwnerSession(null))
      .finally(() => setAuthChecked(true));
  }, [endpoint]);

  useEffect(() => {
    localStorage.setItem(ANNOTATION_MODE_KEY, String(ownerMode));
  }, [ownerMode]);

  const grouped = useMemo(() => {
    const result = new Map<string, AnnotationThread[]>();
    for (const thread of threads) {
      const key = threadKey(thread);
      result.set(key, [...(result.get(key) ?? []), thread]);
    }
    return result;
  }, [threads]);

  const updatePositions = useCallback(() => {
    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)
    );
    const next: PositionedBlock[] = [];
    for (const block of blocks) {
      const key = blockKey(block);
      const count = grouped.get(key)?.length ?? 0;
      if (count === 0) continue;
      const rect = block.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      next.push({
        key,
        block,
        top: rect.top + 4,
        left: Math.min(window.innerWidth - 38, rect.right + 8),
        count,
      });
    }
    setPositions(next);
  }, [grouped]);

  useEffect(() => {
    updatePositions();
    const onMove = () => requestAnimationFrame(updatePositions);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
    };
  }, [updatePositions]);

  useEffect(() => {
    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)
    );
    blocks.forEach(block =>
      block.classList.toggle(
        "inline-comment-active",
        selectedKey !== null && blockKey(block) === selectedKey
      )
    );
    return () =>
      blocks.forEach(block => block.classList.remove("inline-comment-active"));
  }, [selectedKey]);

  useEffect(() => {
    if (!ownerSession || !ownerMode) return;
    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)
    );
    const enter = (event: Event) =>
      setHoveredBlock(event.currentTarget as HTMLElement);
    const leave = () => setHoveredBlock(null);
    blocks.forEach(block => {
      block.classList.add("inline-comment-owner-block");
      block.addEventListener("mouseenter", enter);
      block.addEventListener("mouseleave", leave);
    });
    return () => {
      blocks.forEach(block => {
        block.classList.remove("inline-comment-owner-block");
        block.removeEventListener("mouseenter", enter);
        block.removeEventListener("mouseleave", leave);
      });
    };
  }, [ownerMode, ownerSession]);

  useEffect(() => {
    if (!ownerSession || !ownerMode) return;
    const captureSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setSelectionAnchor(null);
        return;
      }
      const range = selection.getRangeAt(0);
      const start = (
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? range.startContainer
          : range.startContainer.parentElement
      ) as Element | null;
      const end = (
        range.endContainer.nodeType === Node.ELEMENT_NODE
          ? range.endContainer
          : range.endContainer.parentElement
      ) as Element | null;
      const block = start?.closest<HTMLElement>(BLOCK_SELECTOR);
      if (!block || block !== end?.closest(BLOCK_SELECTOR)) {
        setSelectionAnchor(null);
        return;
      }
      const exact = selection.toString().replace(/\s+/g, " ").trim();
      if (!exact || exact.length > 1200) {
        setSelectionAnchor(null);
        return;
      }
      const before = document.createRange();
      before.selectNodeContents(block);
      before.setEnd(range.startContainer, range.startOffset);
      const blockText = cleanBlockText(block);
      const startOffset = before.toString().replace(/\s+/g, " ").trim().length;
      const rect = range.getBoundingClientRect();
      setSelectionAnchor({
        blockId: block.dataset.commentBlockId ?? "",
        headingId: block.dataset.commentHeadingId ?? null,
        exact,
        prefix: blockText.slice(Math.max(0, startOffset - 240), startOffset),
        suffix: blockText.slice(
          startOffset + exact.length,
          startOffset + exact.length + 240
        ),
        view: blockView(block),
      });
      setSelectionPosition({
        top: Math.max(8, rect.top - 42),
        left: Math.min(
          window.innerWidth - 42,
          Math.max(8, rect.left + rect.width / 2 - 18)
        ),
      });
    };
    document.addEventListener("selectionchange", captureSelection);
    return () =>
      document.removeEventListener("selectionchange", captureSelection);
  }, [ownerMode, ownerSession]);

  function anchorForBlock(block: HTMLElement): AnnotationAnchor {
    const exact = cleanBlockText(block).slice(0, 1200);
    return {
      blockId: block.dataset.commentBlockId ?? "",
      headingId: block.dataset.commentHeadingId ?? null,
      exact,
      prefix: "",
      suffix: "",
      view: blockView(block),
    };
  }

  function openComposer(next: ComposerState) {
    setComposer(next);
    setBody(next.initialBody ?? "");
    if (next.anchor)
      setSelectedKey(`${next.anchor.view}:${next.anchor.blockId}`);
  }

  async function saveComment() {
    if (!composer || !body.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (composer.editId) {
        await request(
          `/api/owner/comments/${encodeURIComponent(composer.editId)}`,
          {
            method: "PATCH",
            body: JSON.stringify({ body }),
          }
        );
      } else {
        await request("/api/owner/comments", {
          method: "POST",
          body: JSON.stringify({
            path: articlePath,
            articleTitle,
            body,
            anchor: composer.anchor,
            replyToId: composer.replyToId,
          }),
        });
      }
      setComposer(null);
      setBody("");
      setSelectionAnchor(null);
      window.getSelection()?.removeAllRanges();
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteComment(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setSaving(true);
    try {
      await request(`/api/owner/comments/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setConfirmDeleteId(null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "删除失败");
    } finally {
      setSaving(false);
    }
  }

  const activeThreads = selectedKey ? (grouped.get(selectedKey) ?? []) : [];
  const hoverRect = hoveredBlock?.getBoundingClientRect();

  return (
    <div className="inline-comments-root" data-testid="inline-comments">
      {positions.map(position => (
        <button
          aria-label={`${position.count} 条批注`}
          className="fixed z-30 inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded border border-skin-accent bg-skin-fill px-1.5 text-xs font-semibold text-skin-accent shadow-sm"
          key={position.key}
          onClick={() => {
            setSelectedKey(position.key);
            position.block.scrollIntoView({
              block: "center",
              behavior: "smooth",
            });
          }}
          style={{ left: position.left, top: position.top }}
          title={`${position.count} 条批注`}
          type="button"
        >
          <MessageSquare aria-hidden="true" size={15} />
          {position.count}
        </button>
      ))}

      {ownerSession &&
        ownerMode &&
        hoveredBlock &&
        hoverRect &&
        !selectionAnchor && (
          <button
            aria-label="给整段添加批注"
            className="fixed z-30 inline-flex h-8 w-8 items-center justify-center rounded border border-skin-line bg-skin-fill text-skin-base shadow-sm hover:border-skin-accent hover:text-skin-accent"
            onClick={() =>
              openComposer({ anchor: anchorForBlock(hoveredBlock) })
            }
            style={{
              left: Math.min(window.innerWidth - 38, hoverRect.right + 8),
              top: hoverRect.top + 4,
            }}
            title="给整段添加批注"
            type="button"
          >
            <MessageSquarePlus aria-hidden="true" size={16} />
          </button>
        )}

      {ownerSession && ownerMode && selectionAnchor && (
        <button
          aria-label="给选中文字添加批注"
          className="fixed z-40 inline-flex h-9 w-9 items-center justify-center rounded bg-skin-accent text-skin-inverted shadow-lg"
          onClick={() => openComposer({ anchor: selectionAnchor })}
          style={selectionPosition}
          title="添加批注"
          type="button"
        >
          <MessageSquarePlus aria-hidden="true" size={18} />
        </button>
      )}

      {ownerMode && authChecked && !ownerSession && (
        <button
          aria-label="作者登录"
          className="fixed bottom-5 right-5 z-30 inline-flex h-10 w-10 items-center justify-center rounded border border-skin-line bg-skin-fill shadow-md hover:border-skin-accent hover:text-skin-accent"
          onClick={() => {
            const authorizeUrl = new URL(
              `${endpoint}/auth/github/start`,
              window.location.origin
            );
            authorizeUrl.searchParams.set("origin", window.location.origin);
            authorizeUrl.searchParams.set(
              "returnTo",
              `${window.location.origin}${window.location.pathname}${window.location.search}`
            );
            window.location.assign(authorizeUrl);
          }}
          title="作者登录"
          type="button"
        >
          <LogIn aria-hidden="true" size={17} />
        </button>
      )}

      {ownerSession && authChecked && (
        <div className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded border border-skin-line bg-skin-fill p-1 shadow-md">
          <button
            aria-pressed={ownerMode}
            className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium ${ownerMode ? "bg-skin-accent text-skin-inverted" : "hover:bg-skin-card"}`}
            onClick={() => setOwnerMode(value => !value)}
            title={ownerMode ? "关闭批注模式" : "开启批注模式"}
            type="button"
          >
            <MessageSquarePlus aria-hidden="true" size={16} />
            批注
          </button>
          <IconButton
            label="退出作者登录"
            onClick={() => {
              void request("/api/owner/logout", { method: "POST" })
                .then(() => {
                  setOwnerSession(null);
                  setOwnerMode(false);
                })
                .catch(cause => {
                  setError(cause instanceof Error ? cause.message : "退出失败");
                });
            }}
          >
            <LogOut aria-hidden="true" size={16} />
          </IconButton>
        </div>
      )}

      {(selectedKey || composer) && (
        <aside
          aria-label="文章批注"
          className="fixed inset-x-0 bottom-0 z-50 max-h-[78svh] overflow-y-auto border-t border-skin-line bg-skin-fill p-4 shadow-2xl sm:inset-y-0 sm:left-auto sm:w-[24rem] sm:max-h-none sm:border-l sm:border-t-0"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare aria-hidden="true" size={18} />
              <h2 className="text-base font-semibold">文章批注</h2>
            </div>
            <IconButton
              label="关闭"
              onClick={() => {
                setSelectedKey(null);
                setComposer(null);
              }}
            >
              <X aria-hidden="true" size={17} />
            </IconButton>
          </div>

          {error && (
            <p className="mb-3 border-l-2 border-red-600 pl-3 text-sm text-red-600">
              {error}
            </p>
          )}
          {loading && (
            <Loader2 aria-label="正在加载" className="animate-spin" size={20} />
          )}

          {activeThreads.map(thread => (
            <article
              className="border-b border-skin-line py-4 first:pt-0"
              key={thread.id}
            >
              <blockquote className="mb-3 border-l-2 border-skin-accent pl-3 text-xs opacity-70">
                {thread.anchor.exact}
              </blockquote>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs opacity-70">
                <span>
                  @{thread.author.login} ·{" "}
                  {new Date(thread.createdAt).toLocaleDateString("zh-CN")}
                </span>
                <a
                  aria-label="在 GitHub 查看"
                  href={thread.url}
                  rel="noreferrer"
                  target="_blank"
                  title="在 GitHub 查看"
                >
                  <ExternalLink aria-hidden="true" size={15} />
                </a>
              </div>
              <RichText text={extractAnnotationText(thread.bodyText)} />
              {thread.replies.map(reply => (
                <div
                  className="ml-4 mt-3 border-l border-skin-line pl-3"
                  key={reply.id}
                >
                  <div className="mb-1 text-xs opacity-70">
                    @{reply.author.login}
                  </div>
                  <RichText text={readableReply(reply.bodyText)} />
                  {ownerSession &&
                    ownerMode &&
                    reply.author.login === "llccing" && (
                      <div className="mt-2 flex gap-2">
                        <IconButton
                          label="编辑回复"
                          onClick={() =>
                            openComposer({
                              editId: reply.id,
                              initialBody: readableReply(reply.bodyText),
                            })
                          }
                        >
                          <Pencil aria-hidden="true" size={15} />
                        </IconButton>
                        <IconButton
                          danger
                          label={
                            confirmDeleteId === reply.id
                              ? "再次点击确认删除"
                              : "删除回复"
                          }
                          onClick={() => void deleteComment(reply.id)}
                        >
                          <Trash2 aria-hidden="true" size={15} />
                        </IconButton>
                      </div>
                    )}
                </div>
              ))}
              {ownerSession && ownerMode && (
                <div className="mt-3 flex gap-2">
                  <IconButton
                    label="回复"
                    onClick={() => openComposer({ replyToId: thread.id })}
                  >
                    <Reply aria-hidden="true" size={15} />
                  </IconButton>
                  <IconButton
                    label="编辑批注"
                    onClick={() =>
                      openComposer({
                        editId: thread.id,
                        initialBody: extractAnnotationText(thread.bodyText),
                      })
                    }
                  >
                    <Pencil aria-hidden="true" size={15} />
                  </IconButton>
                  <IconButton
                    danger
                    label={
                      confirmDeleteId === thread.id
                        ? "再次点击确认删除"
                        : "删除批注"
                    }
                    onClick={() => void deleteComment(thread.id)}
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </IconButton>
                </div>
              )}
            </article>
          ))}

          {composer && (
            <div className="mt-4 border-t border-skin-line pt-4">
              {composer.anchor && (
                <blockquote className="mb-3 border-l-2 border-skin-accent pl-3 text-xs opacity-70">
                  {composer.anchor.exact}
                </blockquote>
              )}
              <label
                className="mb-2 block text-sm font-semibold"
                htmlFor="inline-comment-body"
              >
                {composer.editId
                  ? "编辑内容"
                  : composer.replyToId
                    ? "回复"
                    : "新批注"}
              </label>
              <textarea
                autoFocus
                className="min-h-28 w-full resize-y rounded border border-skin-line bg-skin-fill p-3 text-sm outline-none focus:border-skin-accent"
                id="inline-comment-body"
                maxLength={8000}
                onChange={event => setBody(event.target.value)}
                placeholder="写下批注；以 @ai 开头可让 AI 回答"
                value={body}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="rounded px-3 py-2 text-sm hover:bg-skin-card"
                  onClick={() => setComposer(null)}
                  type="button"
                >
                  取消
                </button>
                <button
                  className="inline-flex min-w-20 items-center justify-center gap-2 rounded bg-skin-accent px-3 py-2 text-sm text-skin-inverted disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={saving || !body.trim()}
                  onClick={() => void saveComment()}
                  type="button"
                >
                  {saving ? (
                    <Loader2
                      aria-hidden="true"
                      className="animate-spin"
                      size={16}
                    />
                  ) : (
                    <Send aria-hidden="true" size={16} />
                  )}
                  保存
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
