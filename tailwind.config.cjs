function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      /* 断点必须写在 extend 内 —— 写在 theme 根级会覆盖掉全部默认断点，
         历史上这里只留下 sm，导致 md:/lg:/xl: 全部静默失效。 */
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
        "2xl": "1440px",
      },

      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        sunken: "var(--sunken)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        accent: {
          DEFAULT: "var(--accent)",
          ink: "var(--accent-ink)",
          soft: "var(--accent-soft)",
          rule: "var(--accent-rule)",
        },
        line: "var(--line)",
        mark: "var(--mark)",
      },

      textColor: {
        skin: {
          base: withOpacity("--color-text-base"),
          accent: withOpacity("--color-accent"),
          inverted: withOpacity("--color-fill"),
        },
      },
      backgroundColor: {
        skin: {
          fill: withOpacity("--color-fill"),
          accent: withOpacity("--color-accent"),
          inverted: withOpacity("--color-text-base"),
          card: withOpacity("--color-card"),
          "card-muted": withOpacity("--color-card-muted"),
        },
      },
      outlineColor: {
        skin: {
          fill: withOpacity("--color-accent"),
        },
      },
      borderColor: {
        skin: {
          line: withOpacity("--color-border"),
          fill: withOpacity("--color-text-base"),
          accent: withOpacity("--color-accent"),
        },
      },
      fill: {
        skin: {
          base: withOpacity("--color-text-base"),
          accent: withOpacity("--color-accent"),
        },
        transparent: "transparent",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },

      fontSize: {
        display: ["var(--step-display)", { lineHeight: "var(--lh-display)" }],
        h1: ["var(--step-h1)", { lineHeight: "var(--lh-tight)" }],
        h2: ["var(--step-h2)", { lineHeight: "var(--lh-tight)" }],
        h3: ["var(--step-h3)", { lineHeight: "var(--lh-snug)" }],
        lede: ["var(--step-lede)", { lineHeight: "var(--lh-snug)" }],
        body: ["var(--step-body)", { lineHeight: "var(--lh-body)" }],
        meta: ["var(--step-meta)", { lineHeight: "var(--lh-meta)" }],
        eyebrow: ["var(--step-eyebrow)", { lineHeight: "1.4" }],
      },

      maxWidth: {
        post: "var(--measure-post)",
        wide: "var(--measure-wide)",
        page: "var(--measure-page)",
      },

      borderRadius: {
        container: "var(--r-container)",
        control: "var(--r-control)",
      },

      typography: () => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": "var(--ink)",
            "--tw-prose-headings": "var(--ink)",
            "--tw-prose-lead": "var(--muted)",
            "--tw-prose-links": "var(--ink)",
            "--tw-prose-bold": "var(--ink)",
            "--tw-prose-counters": "var(--muted)",
            "--tw-prose-bullets": "var(--accent)",
            "--tw-prose-hr": "var(--line)",
            "--tw-prose-quotes": "var(--ink)",
            "--tw-prose-quote-borders": "var(--accent)",
            "--tw-prose-captions": "var(--muted)",
            "--tw-prose-code": "var(--ink)",
            "--tw-prose-th-borders": "var(--line)",
            "--tw-prose-td-borders": "var(--line)",
            // 正文度量：中文一行约 38 字
            maxWidth: "38em",
            fontSize: "var(--step-body)",
            lineHeight: "var(--lh-body)",
            color: "var(--ink)",
            h1: {
              fontSize: "var(--step-h1)",
              lineHeight: "var(--lh-tight)",
              fontWeight: "700",
              letterSpacing: "-0.01em",
            },
            h2: {
              fontSize: "var(--step-h2)",
              lineHeight: "var(--lh-tight)",
              fontWeight: "700",
              marginTop: "2.5em",
              paddingBottom: "0.4em",
              borderBottom: "1px solid var(--line)",
            },
            h3: {
              fontSize: "var(--step-h3)",
              fontWeight: "600",
              marginTop: "2em",
            },
            h4: { fontWeight: "600" },
            p: { marginTop: "1.35em", marginBottom: "1.35em" },
            blockquote: {
              fontStyle: "normal",
              fontWeight: "400",
              borderLeftWidth: "3px",
              borderLeftColor: "var(--accent)",
              paddingLeft: "1.25em",
              color: "var(--ink)",
              backgroundColor: "var(--sunken)",
              paddingBlock: "1em",
              paddingRight: "1em",
              margin: "1.75em 0",
            },
            "blockquote p:first-of-type::before": { content: "none" },
            "blockquote p:last-of-type::after": { content: "none" },
            pre: {
              color: "var(--ink)",
              backgroundColor: "var(--sunken)",
              border: "1px solid var(--line)",
              borderRadius: "0",
              overflowX: "auto",
            },
            code: {
              color: "var(--ink)",
              backgroundColor: "var(--sunken)",
              border: "1px solid var(--line)",
              padding: "0.1em 0.35em",
              borderRadius: "0",
              fontWeight: "500",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            a: {
              color: "var(--ink)",
              textDecorationLine: "underline",
              textDecorationStyle: "solid",
              textDecorationColor: "var(--accent-rule)",
              textDecorationThickness: "1px",
              textUnderlineOffset: "3px",
              fontWeight: "500",
            },
            "a:hover": { color: "var(--accent)" },
            hr: { borderTopColor: "var(--line)", marginBlock: "3em" },
            "ol > li::marker": { color: "var(--accent)", fontWeight: "600" },
            "ul > li::marker": { color: "var(--accent)" },
            table: { fontSize: "var(--step-meta)", display: "block", overflowX: "auto" },
            thead: { borderBottomWidth: "1px", borderBottomColor: "var(--ink)" },
            "thead th": { fontWeight: "600", color: "var(--ink)" },
            img: { border: "1px solid var(--line)", borderRadius: "0" },
            figcaption: { fontSize: "var(--step-meta)", color: "var(--muted)" },
            strong: { color: "var(--ink)", fontWeight: "700" },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
