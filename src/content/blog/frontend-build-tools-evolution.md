---
pubDatetime: 2026-05-01T15:00:00Z
title: 前端构建工具十年：从 Gulp 到 Vite，再到 Rolldown 的时代终章
slug: frontend-build-tools-evolution
featured: false
draft: false
tags:
  - vite
  - webpack
  - rolldown
  - frontend
  - build-tools
description: 从 2014 年的 Grunt/Gulp 任务流，到 Webpack 的模块打包时代，再到 Vite 的 ESM 革命和 Rolldown 的 Rust 重写——一篇文章看懂前端构建工具十年演化史。
---

## 前言

2017 年，我写了一篇 Gulp 搭建前端基础设施的文章——配置 `gulp-sass`、`gulp-autoprefixer`、`browser-sync`，构建一套本地开发工作流。

今天，Gulp 早已退出主流舞台，Webpack 也在被挑战，Vite 成为新标准，而 Rolldown（Rust 重写的 Rollup）正在接管 Vite 的底层。这是一部真实的技术演化史，每一代工具的出现都是对上一代痛点的精准回应。

---

## 一、2014-2016：任务流时代（Grunt / Gulp）

### 1.1 时代背景

2014 年前，前端没有"构建"这个概念——手写 HTML/CSS/JS，FTP 上传，完事。随着前端工程复杂度上升，开始出现对以下能力的需求：

- SCSS/Less → CSS 编译
- ES6 → ES5 转译（Babel 初期）
- 图片压缩
- 代码压缩 + 合并（减少 HTTP 请求，那时没有 HTTP/2）
- 本地开发服务器 + LiveReload

**Grunt**（2012 年）是第一个大规模流行的前端任务运行器，基于配置文件描述任务。

**Gulp**（2013 年）用 Node.js 流（Stream）替代 Grunt 的临时文件机制，速度更快，代码更直观。

### 1.2 Gulp 的工作方式

```javascript
// gulpfile.js（2017 年风格）
const gulp = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const autoprefixer = require("gulp-autoprefixer");
const uglify = require("gulp-uglify");
const browserSync = require("browser-sync").create();

// 编译 SCSS
gulp.task("styles", () => {
  return gulp
    .src("src/scss/**/*.scss")
    .pipe(sass({ outputStyle: "compressed" }).on("error", sass.logError))
    .pipe(autoprefixer({ browsers: ["last 2 versions"] }))
    .pipe(gulp.dest("dist/css"))
    .pipe(browserSync.stream());
});

// 压缩 JS
gulp.task("scripts", () => {
  return gulp.src("src/js/**/*.js").pipe(uglify()).pipe(gulp.dest("dist/js"));
});

// 监听文件变化
gulp.task("watch", () => {
  browserSync.init({ server: "./dist" });
  gulp.watch("src/scss/**/*.scss", gulp.series("styles"));
  gulp.watch("src/js/**/*.js", gulp.series("scripts"));
});

gulp.task("default", gulp.series("styles", "scripts", "watch"));
```

### 1.3 任务流时代的局限

- **没有模块系统**：JS 文件之间的依赖靠手动排序或全局变量
- **无法做 Tree Shaking**：所有代码都打包进来，管你用不用
- **没有代码分割**：一个大 bundle，首屏加载慢
- **开发体验原始**：HMR 实现粗糙，全页刷新

---

## 二、2017-2022：Webpack 称霸

### 2.1 Webpack 的核心思想

Webpack 的革命性在于：**它把整个应用视为一张依赖图（Dependency Graph）**，从入口文件出发，递归解析所有 `import`/`require`，最终输出优化过的 bundle。

```javascript
// webpack.config.js
module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
    new MiniCssExtractPlugin({ filename: "[name].[contenthash].css" }),
  ],
  optimization: {
    splitChunks: {
      chunks: "all", // 代码分割
    },
  },
};
```

### 2.2 Webpack 的重要能力

- **代码分割（Code Splitting）**：按路由分包，首屏只加载必要代码
- **Tree Shaking**：ES Module 静态分析，移除未使用代码
- **HMR（Hot Module Replacement）**：修改代码，浏览器局部热更新
- **Loader 生态**：几乎任何文件类型都能处理（CSS、图片、字体、SVG…）
- **Module Federation**：Webpack 5 引入，微前端的重要基础

### 2.3 Webpack 的痛点

随着应用规模增大，Webpack 的问题越来越突出：

```
# 一个中型 React 项目的冷启动时间演化
2019年（Webpack 4）：冷启动 45 秒
2021年（Webpack 5）：冷启动 30 秒（有缓存后 5-10 秒）
每次 HMR：1-3 秒（大型项目可能更慢）
```

**根本原因**：Webpack 在启动时要把所有模块都解析、转换、打包成 bundle，然后才能启动开发服务器。项目越大，等待越久。

---

## 三、2020-2023：Vite 颠覆

### 3.1 ESM 原生开发服务器

Vite 的核心洞察：**现代浏览器原生支持 ES Module，开发时根本不需要打包！**

```
# 传统 bundler（Webpack）
所有模块 → bundle → 开发服务器 → 浏览器
   ↑ 这一步很慢

# Vite
开发服务器（极快启动）→ 浏览器按需请求模块 → 服务器即时转换单个模块
   ↑ 只转换被请求的模块
```

```javascript
// vite.config.ts — 相比 webpack 配置极为简洁
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [vue()], // 或 react()
  build: {
    // 生产构建仍然打包（使用 Rollup）
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["vue", "vue-router", "pinia"],
        },
      },
    },
  },
});
```

### 3.2 冷启动速度对比

```
项目：一个包含 500 个模块的中型 Vue 3 应用

Webpack 5 冷启动：~20 秒（无缓存），~5 秒（有缓存）
Vite 冷启动：~300ms（无论有无缓存）

HMR 速度：
Webpack：1-3 秒
Vite：<50ms（大多数情况 <10ms）
```

### 3.3 Vite 的架构

```
开发时：
  Vite Dev Server（基于 esbuild 预构建依赖）
  ├── esbuild：预构建 node_modules（比 Babel 快 10-100 倍）
  └── Rollup 插件兼容 API（复用庞大的 Rollup 插件生态）

生产构建：
  Rollup（JavaScript 写的，成熟稳定）
  └── 输出优化的 ES Module bundle
```

### 3.4 Vite 的局限

- **开发/生产不一致**：开发用 ESM，生产用 Rollup，偶尔出现"开发没问题，生产挂了"
- **CommonJS 兼容**：部分 CJS 依赖需要特殊处理
- **大型应用的 bundle 优化**：Rollup 的分包能力不如 Webpack 灵活

---

## 四、2023-2024：Rspack 出现

[Rspack](https://www.rspack.dev/) 是字节跳动开源的工具——用 Rust 重写 Webpack，目标是兼容 Webpack API 的同时获得 5-10 倍的构建速度提升。

```javascript
// rspack.config.js — 几乎与 webpack.config.js 一致
const { HtmlRspackPlugin } = require("@rspack/core");

module.exports = {
  entry: "./src/index.js",
  plugins: [new HtmlRspackPlugin({ template: "./index.html" })],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "builtin:swc-loader", // 内置 SWC，无需额外配置
          options: { jsc: { parser: { syntax: "typescript" } } },
        },
      },
    ],
  },
};
```

**适用场景**：已有大型 Webpack 项目，想要提速但迁移成本高的团队。

---

## 五、2025-2026：Rolldown 登场

### 5.1 什么是 Rolldown

[Rolldown](https://rolldown.rs/) 是用 **Rust** 重写的 Rollup，由 Vite 核心团队开发，目标是成为 Vite 的新底层打包器。

**现状（2026）**：Vite 文档已将生产构建描述为由 Rolldown 完成；开发阶段仍然是 Vite 的原生 ESM Dev Server 模式。

### 5.2 为什么需要 Rolldown

Vite 的"开发/生产不一致"问题根源在于：开发时用 esbuild（Go），生产时用 Rollup（JS），两者行为不完全一致。

Rolldown 的目标：

```
Vite + Rolldown（2026 文档口径）：
  开发时：Vite ESM Dev Server（按需转换）
  生产时：Rolldown 打包
  ↑ 目标是缩小开发与生产行为差异，并提升大规模构建性能
```

### 5.3 性能数据（以官方基准为参考）

```
Rolldown 官网展示的公开基准（约 19k 模块，含压缩与 sourcemap）显示：
Rolldown 与 esbuild 处于同一速度量级，并显著快于传统 Rollup+esbuild 流水线。

注：不同项目的插件链、代码形态和 I/O 条件会显著影响绝对耗时，请以你自己的仓库基准为准。
```

---

## 六、选型矩阵（2026 年建议）

| 场景                       | 推荐工具                      | 理由                   |
| -------------------------- | ----------------------------- | ---------------------- |
| 新建 React/Vue/Svelte 应用 | **Vite**                      | 开发体验最佳，生态成熟 |
| 新建 Next.js/Nuxt 项目     | Webpack（Next）/ Vite（Nuxt） | 框架内置，无需选择     |
| 存量大型 Webpack 项目提速  | **Rspack**                    | API 兼容，迁移成本低   |
| 发布 npm 库                | **Rolldown / tsup**           | 输出格式灵活，体积小   |
| 纯 Node.js 后端            | **esbuild / tsx**             | 不需要前端打包能力     |
| 遗留多页应用（MPA）        | Webpack 5 / Vite（MPA 模式）  | 视具体情况             |

---

## 七、从存量 Webpack 项目迁移到 Vite

### 7.1 评估可行性

不适合迁移的情况：

- 大量依赖 Webpack 特有功能（`require.context`、Module Federation）
- 大量 CJS 依赖，无 ESM 版本
- 自定义 Webpack loader 难以用 Vite 插件替代

### 7.2 迁移步骤

```bash
# 1. 安装 Vite 和对应框架插件
pnpm add -D vite @vitejs/plugin-react  # 或 @vitejs/plugin-vue

# 2. 创建 vite.config.ts
# 3. 调整 index.html（Vite 的入口是根目录的 index.html）
# 4. 替换环境变量（REACT_APP_ → VITE_）
# 5. 处理 CommonJS 依赖（vite-plugin-commonjs 或 optimizeDeps）
```

```typescript
// vite.config.ts（从 CRA 迁移的典型配置）
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // 处理一些 CJS 模块的兼容问题
    },
  },
  define: {
    // CRA 使用 process.env，Vite 使用 import.meta.env
    "process.env": process.env,
  },
});
```

### 7.3 常见问题

**`require` 不支持**：

```javascript
// ❌ Vite 不支持（ESM 模式下）
const img = require("./logo.png");

// ✅ 改为 ESM import
import logo from "./logo.png";
```

**`__dirname` / `__filename` 不可用**：

```javascript
// ✅ 使用 import.meta.url
import { fileURLToPath } from "url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
```

---

## 总结

| 时代      | 代表工具         | 核心贡献               |
| --------- | ---------------- | ---------------------- |
| 2014-2016 | Gulp/Grunt       | 前端构建流程化         |
| 2017-2022 | Webpack          | 模块化、代码分割、HMR  |
| 2020-2024 | Vite             | ESM 原生开发、极速 HMR |
| 2023-至今 | Rspack、Rolldown | Rust 重写，极致性能    |

每一代工具都没有彻底消失——Webpack 在大型企业项目中仍然活跃，Gulp 在遗留项目中还在运行。但对于新项目，选择很清晰：**Vite**（或基于它的框架工具链）是 2026 年的默认答案。

---

## 参考资料

- [Vite 官方文档](https://vite.dev/)
- [Rolldown 官网](https://rolldown.rs/)
- [Rspack 官网](https://www.rspack.dev/)
- [Why Vite](https://vite.dev/guide/why)
- [The State of JS 2024 — Build Tools](https://stateofjs.com/en-US/libraries/build_tools/)
- [Webpack 5 Migration Guide](https://webpack.js.org/migrate/5/)
