---
pubDatetime: 2026-05-01T14:00:00Z
title: VuePress 退场，VitePress 登场：2026 年技术文档站的最优解
slug: vuepress-to-vitepress-giscus
featured: false
draft: false
tags:
  - vitepress
  - vuepress
  - documentation
  - vue
description: VuePress 1/2 时代的终结与 VitePress 的崛起。本文详解 VitePress 核心优势、从 VuePress 的迁移路径、Giscus 评论系统接入，以及搜索、国际化、自定义主题等实战配置。
---

## 前言

2019 年我写过一篇 VuePress + Vssue 搭建文档站并接入评论系统的文章。当时 VuePress 1.x 是 Vue 生态文档站的不二之选，Vssue 则是基于 GitHub Issues 的评论方案。

几年过去，主流选择已经明显变化：Vue 生态的新文档站大量转向 **VitePress**，评论方案也从 Vssue 逐步迁移到 **Giscus**（基于 GitHub Discussions）。

这次替换不是小版本迭代，而是从根基到上层的全面升级，值得单独写一篇。

---

## 一、VuePress 的困境

### 1.1 VuePress 1.x 的局限

VuePress 1.x 基于 Webpack + Vue 2，随着 Vue 3 和 Vite 的兴起，问题越来越突出：

- **冷启动慢**：Webpack 构建，数百页文档冷启动需要 30-60 秒
- **Vue 2 依赖**：无法享用 Vue 3 的 Composition API 和 `<script setup>`
- **配置繁琐**：需要 `.vuepress/config.js` + `enhanceApp.js` + 各种 webpack 配置

### 1.2 VuePress 2.x 的现实处境

VuePress 2.x 切换到 Vue 3 + Vite，并由社区团队持续维护。它并没有“消失”，但在 Vue 官方文档与大量新项目实践中，VitePress 的心智占比更高，迁移讨论也更多围绕 VitePress 展开。

### 1.3 Vssue vs Giscus

Vssue 基于 GitHub **Issues** 存储评论，问题是：

- Issues 的通知系统不适合评论场景
- 没有嵌套回复
- 需要用户授权 OAuth App

Giscus 基于 GitHub **Discussions**（2021 年推出），优势明显：

- Discussions 天生适合评论/讨论场景
- 支持表情回应、嵌套回复
- 基于 `<script>` 标签，无需 OAuth 配置

---

## 二、VitePress 的核心优势

[VitePress](https://vitepress.dev/) 是 Evan You 主导开发的 Vue 官方文档站工具，Vue 3 官方文档本身就是用 VitePress 搭建的。

### 2.1 性能飞跃

| 指标     | VuePress 1        | VitePress              |
| -------- | ----------------- | ---------------------- |
| 冷启动   | 30-60s（Webpack） | 1-3s（Vite ESM）       |
| HMR 更新 | 2-5s              | <100ms                 |
| 生产构建 | 慢                | 快（Rollup）           |
| 包体积   | 较大              | 极小（SSG + 代码分割） |

### 2.2 Vue 3 内核

VitePress 主题完全用 Vue 3 + `<script setup>` 编写，可以直接在 Markdown 中使用 Vue 3 组件：

```markdown
<!-- docs/guide/demo.md -->

# 交互式演示

<MyInteractiveDemo />

<script setup>
import MyInteractiveDemo from '../components/MyInteractiveDemo.vue'
</script>
```

### 2.3 极简配置

```typescript
// docs/.vitepress/config.ts — 最小配置，开箱即用
import { defineConfig } from "vitepress";

export default defineConfig({
  title: "我的文档",
  description: "这是一个文档站",
  themeConfig: {
    nav: [
      { text: "指南", link: "/guide/" },
      { text: "API", link: "/api/" },
    ],
    sidebar: {
      "/guide/": [
        { text: "快速开始", link: "/guide/getting-started" },
        { text: "配置", link: "/guide/config" },
      ],
    },
    socialLinks: [{ icon: "github", link: "https://github.com/myorg/myrepo" }],
  },
});
```

---

## 三、从 VuePress 迁移

### 3.1 目录结构对比

```
# VuePress 1.x 结构
docs/
├── .vuepress/
│   ├── config.js
│   ├── enhanceApp.js
│   ├── components/
│   └── public/
├── guide/
│   └── README.md     ← 使用 README.md 作为目录索引
└── README.md

# VitePress 结构
docs/
├── .vitepress/
│   ├── config.ts
│   └── theme/         ← 自定义主题（可选）
│       ├── index.ts
│       └── Layout.vue
├── guide/
│   └── index.md      ← 使用 index.md 作为目录索引
└── index.md
```

### 3.2 frontmatter 差异

```markdown
## <!-- VuePress 1.x -->

title: 快速开始
sidebar: auto
prev: false
next:
text: '配置'
link: '/guide/config'

---

## <!-- VitePress（等价配置）-->

title: 快速开始
outline: deep
prev: false
next:
text: '配置'
link: /guide/config

---
```

### 3.3 配置 API 对照

| VuePress 1.x                   | VitePress                                      |
| ------------------------------ | ---------------------------------------------- |
| `themeConfig.nav`              | `themeConfig.nav`                              |
| `themeConfig.sidebar`          | `themeConfig.sidebar`                          |
| `themeConfig.logo`             | `themeConfig.logo`                             |
| `enhanceApp.js`                | `.vitepress/theme/index.ts`                    |
| `@vuepress/plugin-search`      | 内置 `search: { provider: 'local' }`           |
| `@vuepress/plugin-back-to-top` | 内置                                           |
| `@vuepress/plugin-medium-zoom` | 默认主题可用中图缩放（需要时可按主题二次定制） |

### 3.4 自定义主题迁移

```javascript
// VuePress enhanceApp.js
export default ({ Vue, router, siteData }) => {
  Vue.component("MyComponent", MyComponent);
};
```

```typescript
// VitePress .vitepress/theme/index.ts
import DefaultTheme from "vitepress/theme";
import MyComponent from "./components/MyComponent.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("MyComponent", MyComponent);
  },
};
```

---

## 四、Giscus 评论系统接入

### 4.1 准备工作

1. **确保仓库是公开的**（私有仓库 Giscus 不可用）
2. 在仓库 **Settings → Features → Discussions** 中开启 Discussions
3. 安装 [Giscus GitHub App](https://github.com/apps/giscus) 并授权该仓库
4. 访问 [giscus.app](https://giscus.app/zh-CN) 生成配置代码

### 4.2 创建 Giscus 组件

```vue
<!-- .vitepress/theme/components/GiscusComments.vue -->
<template>
  <div class="giscus-wrapper">
    <component
      :is="'script'"
      src="https://giscus.app/client.js"
      :data-repo="repo"
      :data-repo-id="repoId"
      :data-category="category"
      :data-category-id="categoryId"
      data-mapping="pathname"
      data-strict="0"
      data-reactions-enabled="1"
      data-emit-metadata="0"
      data-input-position="top"
      :data-theme="theme"
      data-lang="zh-CN"
      crossorigin="anonymous"
      async
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useData } from "vitepress";

const props = defineProps<{
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
}>();

const { isDark } = useData();

// 跟随站点明暗主题
const theme = computed(() => (isDark.value ? "dark" : "light"));

// 主题切换时通知 Giscus iframe
watch(theme, newTheme => {
  const iframe = document.querySelector<HTMLIFrameElement>(
    "iframe.giscus-frame"
  );
  iframe?.contentWindow?.postMessage(
    { giscus: { setConfig: { theme: newTheme } } },
    "https://giscus.app"
  );
});
</script>
```

### 4.3 在 Layout 中注入评论区

```vue
<!-- .vitepress/theme/Layout.vue -->
<template>
  <DefaultTheme.Layout>
    <template #doc-after>
      <GiscusComments
        repo="myorg/myrepo"
        repo-id="R_kgDOxxxxxx"
        category="Announcements"
        category-id="DIC_kwDOxxxxxx"
      />
    </template>
  </DefaultTheme.Layout>
</template>

<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import GiscusComments from "./components/GiscusComments.vue";
</script>
```

```typescript
// .vitepress/theme/index.ts
import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";

export default {
  extends: DefaultTheme,
  Layout,
};
```

---

## 五、搜索配置

### 5.1 本地搜索（MiniSearch）

VitePress 内置了基于 [MiniSearch](https://lucaong.github.io/minisearch/) 的本地搜索，零配置：

```typescript
// .vitepress/config.ts
export default defineConfig({
  themeConfig: {
    search: {
      provider: "local",
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: "搜索文档",
                buttonAriaLabel: "搜索文档",
              },
              modal: {
                noResultsText: "无法找到相关结果",
                resetButtonTitle: "清除查询条件",
                footer: {
                  selectText: "选择",
                  navigateText: "切换",
                },
              },
            },
          },
        },
      },
    },
  },
});
```

### 5.2 Algolia DocSearch（适合大型文档）

```typescript
themeConfig: {
  search: {
    provider: 'algolia',
    options: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'YOUR_INDEX_NAME'
    }
  }
}
```

Algolia DocSearch 对开源项目免费，但需要[申请](https://docsearch.algolia.com/apply/)。

---

## 六、国际化配置

```typescript
// .vitepress/config.ts
export default defineConfig({
  locales: {
    root: {
      label: "简体中文",
      lang: "zh-CN",
      themeConfig: {
        nav: [{ text: "指南", link: "/guide/" }],
      },
    },
    en: {
      label: "English",
      lang: "en-US",
      link: "/en/",
      themeConfig: {
        nav: [{ text: "Guide", link: "/en/guide/" }],
      },
    },
  },
});
```

目录结构：

```
docs/
├── guide/          ← 中文文档（根路径）
├── en/
│   └── guide/      ← 英文文档
└── index.md
```

---

## 七、自定义主题：Layout Slots 与 CSS 变量

### 7.1 Layout Slots

VitePress 默认主题提供了丰富的插槽：

```vue
<DefaultTheme.Layout>
  <!-- 导航栏左侧 -->
  <template #nav-bar-title-after>
    <Badge type="tip" text="Beta" />
  </template>

  <!-- 侧边栏顶部 -->
  <template #sidebar-nav-before>
    <div class="sidebar-announcement">🎉 v2.0 发布！</div>
  </template>

  <!-- 文章底部 -->
  <template #doc-after>
    <GiscusComments ... />
  </template>

  <!-- 首页英雄区之后 -->
  <template #home-hero-after>
    <MyFeatureShowcase />
  </template>
</DefaultTheme.Layout>
```

### 7.2 CSS 变量覆盖

VitePress 主题的所有颜色都通过 CSS 变量定义，覆盖很简单：

```css
/* .vitepress/theme/custom.css */
:root {
  --vp-c-brand-1: #646cff; /* 主题色 */
  --vp-c-brand-2: #747bff;
  --vp-font-family-base: "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* 中文字体优化 */
.vp-doc {
  line-height: 1.8;
  font-size: 15px;
}
```

---

## 八、部署到 GitHub Pages

```yaml
# .github/workflows/docs.yml
name: Deploy Docs

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # 用于 git log 生成 lastUpdated

      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm docs:build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

---

## 总结

VitePress 相比 VuePress 的提升是全方位的：构建速度快 10 倍以上，配置简洁，Vue 3 原生，内置功能更完整。Giscus 则是目前静态站点评论系统的最优解：基于 GitHub Discussions，无需服务器，体验优雅。

如果你现在还在用 VuePress 1.x，迁移成本远比你想象的低，大多数文档只需要把 `README.md` 重命名为 `index.md`，调整一下 `config.ts` 结构即可。

---

## 参考资料

- [VitePress 官方文档](https://vitepress.dev/)
- [从 VuePress 迁移到 VitePress](https://vitepress.dev/guide/migration-from-vuepress)
- [Giscus 官网](https://giscus.app/zh-CN)
- [Vue 3 官方文档（VitePress 驱动）](https://vuejs.org/)
- [VitePress 主题 API](https://vitepress.dev/reference/default-theme-layout)
