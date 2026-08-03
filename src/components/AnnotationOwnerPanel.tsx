import { Loader2, LogIn, LogOut, MessageSquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

const ANNOTATION_MODE_KEY = "rowan-comments-annotation-mode";

type OwnerSession = {
  canWrite: true;
  login: string;
  csrfToken: string;
};

type PublicSession = { canWrite: false };

export default function AnnotationOwnerPanel() {
  const [session, setSession] = useState<OwnerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAnnotationMode(localStorage.getItem(ANNOTATION_MODE_KEY) === "true");
    fetch("/api/owner/session", { credentials: "include" })
      .then(async response => {
        if (!response.ok) return;
        const session = (await response.json()) as OwnerSession | PublicSession;
        setSession(session.canWrite ? session : null);
      })
      .catch(() => setError("无法检查作者会话"))
      .finally(() => setLoading(false));
  }, []);

  function toggleAnnotationMode() {
    const next = !annotationMode;
    localStorage.setItem(ANNOTATION_MODE_KEY, String(next));
    setAnnotationMode(next);
  }

  async function logout() {
    if (!session) return;
    setError("");
    const response = await fetch("/api/owner/logout", {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": session.csrfToken },
    });
    if (!response.ok) {
      setError("退出失败，请重试");
      return;
    }
    localStorage.setItem(ANNOTATION_MODE_KEY, "false");
    setAnnotationMode(false);
    setSession(null);
  }

  if (loading) {
    return <Loader2 aria-label="正在检查作者会话" className="animate-spin" />;
  }

  if (!session) {
    return (
      <div className="border-y border-skin-line py-6">
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <button
          className="inline-flex items-center gap-2 rounded bg-skin-accent px-4 py-2 font-medium text-skin-inverted"
          onClick={() => {
            const authorizeUrl = new URL(
              "/auth/github/start",
              window.location.origin
            );
            authorizeUrl.searchParams.set("origin", window.location.origin);
            authorizeUrl.searchParams.set("returnTo", window.location.href);
            window.location.assign(authorizeUrl);
          }}
          type="button"
        >
          <LogIn aria-hidden="true" size={18} />
          使用 GitHub 登录
        </button>
      </div>
    );
  }

  return (
    <div className="border-y border-skin-line py-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs opacity-70">已登录</div>
          <div className="font-semibold">@{session.login}</div>
        </div>
        <button
          aria-label="退出作者登录"
          className="inline-flex h-9 w-9 items-center justify-center rounded border border-skin-line hover:border-red-600 hover:text-red-600"
          onClick={() => void logout()}
          title="退出作者登录"
          type="button"
        >
          <LogOut aria-hidden="true" size={17} />
        </button>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <button
        aria-pressed={annotationMode}
        className={`inline-flex items-center gap-2 rounded px-4 py-2 font-medium ${annotationMode ? "bg-skin-accent text-skin-inverted" : "border border-skin-line hover:border-skin-accent"}`}
        onClick={toggleAnnotationMode}
        type="button"
      >
        <MessageSquarePlus aria-hidden="true" size={18} />
        {annotationMode ? "批注模式已开启" : "开启批注模式"}
      </button>
      <a className="ml-4 underline underline-offset-4" href="/posts/">
        进入文章
      </a>
    </div>
  );
}
