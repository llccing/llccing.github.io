import satori, { type SatoriOptions } from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import { type CollectionEntry } from "astro:content";
import postOgImage from "./og-templates/post";
import siteOgImage from "./og-templates/site";

/* ==========================================================================
   OG 图字体
   历史上这里会在构建时联网抓取 1001fonts 的 IBM Plex Mono —— 一旦断网整个
   build 直接失败，而且已经和「不加载外部字体」的设计约定冲突。
   现在改为：本地系统字体优先 → 远端兜底 → 都拿不到就跳过 OG 生成并告警，
   保证构建永远不会被字体拖垮。
   ========================================================================== */

const CANDIDATES = {
  regular: [
    process.env.OG_FONT_REGULAR,
    "C:\\Windows\\Fonts\\Deng.ttf",
    "C:\\Windows\\Fonts\\msyh.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
  ],
  bold: [
    process.env.OG_FONT_BOLD,
    "C:\\Windows\\Fonts\\Dengb.ttf",
    "C:\\Windows\\Fonts\\msyhbd.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
  ],
};

const REMOTE = {
  regular: "https://www.1001fonts.com/download/font/ibm-plex-mono.regular.ttf",
  bold: "https://www.1001fonts.com/download/font/ibm-plex-mono.bold.ttf",
};

function readLocal(list: (string | undefined)[]): ArrayBuffer | null {
  for (const file of list) {
    if (!file) continue;
    try {
      if (!fs.existsSync(file)) continue;
      const buf = fs.readFileSync(file);
      return buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength
      ) as ArrayBuffer;
    } catch {
      /* 继续尝试下一个候选 */
    }
  }
  return null;
}

async function fetchRemote(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function loadFont(kind: "regular" | "bold"): Promise<ArrayBuffer | null> {
  const local = readLocal(CANDIDATES[kind]);
  if (local) return local;
  return await fetchRemote(REMOTE[kind]);
}

const [fontRegular, fontBold] = await Promise.all([
  loadFont("regular"),
  loadFont("bold"),
]);

let options: SatoriOptions | null = null;

if (fontRegular) {
  options = {
    width: 1200,
    height: 630,
    embedFont: true,
    fonts: [
      {
        name: "System UI",
        data: fontRegular,
        weight: 400,
        style: "normal",
      },
      {
        name: "System UI",
        data: fontBold ?? fontRegular,
        weight: 700,
        style: "normal",
      },
    ],
  };
} else {
  console.warn(
    "[og] 未找到可用字体，跳过 OG 图生成。可设置 OG_FONT_REGULAR / OG_FONT_BOLD 指定字体文件。"
  );
}

function svgBufferToPngBuffer(svg: string) {
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  return pngData.asPng();
}

/**
 * 字体不可用时返回 null —— 调用方会跳过该文件，而不是让整个构建失败。
 */
export async function generateOgImageForPost(
  post: CollectionEntry<"blog">
): Promise<Buffer | null> {
  if (!options) return null;
  const svg = await satori(postOgImage(post), options);
  return svgBufferToPngBuffer(svg);
}

export async function generateOgImageForSite(): Promise<Buffer | null> {
  if (!options) return null;
  const svg = await satori(siteOgImage(), options);
  return svgBufferToPngBuffer(svg);
}
