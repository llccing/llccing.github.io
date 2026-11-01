import { SITE } from "@config";
import type { CollectionEntry } from "astro:content";

/* OG 卡沿用站点语言：纸底 / 墨字 / 朱砂批注 / 直角 / 分割线
   satori 只支持 flex 布局，且每个多子节点容器必须显式声明 display:flex */

const CANVAS = "#f6f5f2";
const INK = "#1a1a18";
const MUTED = "#6e6c66";
const ACCENT = "#b8322a";
const LINE = "#dedbd4";

const fontFamily = '"System UI"';

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date) {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export default (post: CollectionEntry<"blog">) => {
  const tags = (post.data.tags ?? []).slice(0, 3);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: CANVAS,
        color: INK,
        fontFamily,
        padding: "56px 64px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          borderTop: `6px solid ${ACCENT}`,
          paddingTop: "40px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: 22,
              letterSpacing: "0.18em",
              color: MUTED,
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: ACCENT, fontWeight: 700 }}>{SITE.title}</span>
            <span>·</span>
            <span>Technical Dossier</span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "32px",
              marginBottom: "28px",
              borderBottom: `1px solid ${LINE}`,
              width: "100%",
            }}
          />

          <div
            style={{
              display: "flex",
              fontSize: tags.length > 0 ? 62 : 72,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: INK,
            }}
          >
            {post.data.title}
          </div>

          {tags.length > 0 && (
            <div style={{ display: "flex", gap: "12px", marginTop: "28px" }}>
              {tags.map(tag => (
                <div
                  key={tag}
                  style={{
                    display: "flex",
                    border: `1px solid ${LINE}`,
                    padding: "6px 14px",
                    color: INK,
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  {String(tag)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            width: "100%",
            paddingTop: "24px",
            borderTop: `1px solid ${LINE}`,
            fontSize: 26,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex", fontWeight: 700, color: INK }}>
            {post.data.author}
          </div>
          <div style={{ display: "flex" }}>
            {formatDate(post.data.pubDatetime)}
          </div>
        </div>
      </div>
    </div>
  );
};
