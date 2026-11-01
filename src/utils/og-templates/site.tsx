import { SITE } from "@config";

/* OG 卡沿用站点语言：纸底 / 墨字 / 朱砂批注 / 直角 / 分割线 */

const CANVAS = "#f6f5f2";
const INK = "#1a1a18";
const MUTED = "#6e6c66";
const ACCENT = "#b8322a";
const LINE = "#dedbd4";

const fontFamily = '"System UI"';

export default () => {
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
              fontSize: 22,
              letterSpacing: "0.18em",
              color: MUTED,
              textTransform: "uppercase",
            }}
          >
            Technical Dossier
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "28px",
              marginBottom: "32px",
              borderBottom: `1px solid ${LINE}`,
              width: "100%",
            }}
          />

          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: INK,
            }}
          >
            {SITE.title}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "24px",
              fontSize: 30,
              lineHeight: 1.5,
              color: MUTED,
            }}
          >
            {SITE.desc}
          </div>
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
          }}
        >
          <div style={{ display: "flex", color: ACCENT, fontWeight: 700 }}>
            {new URL(SITE.website).hostname}
          </div>
          <div style={{ display: "flex", color: MUTED }}>{SITE.author}</div>
        </div>
      </div>
    </div>
  );
};
