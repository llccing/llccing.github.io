---
pubDatetime: 2026-05-01T12:00:00Z
title: Lerna 已死，Monorepo 未亡：pnpm workspace + Changesets + Turborepo 实战
slug: monorepo-pnpm-changesets-turborepo
featured: false
draft: false
tags:
  - monorepo
  - pnpm
  - turborepo
  - frontend
description: Lerna 2022 年停维护后，现代 Monorepo 的最优解是什么？本文手把手讲解 pnpm workspace + Changesets + Turborepo 的完整实战配置，以及如何从 Lerna 平滑迁移。
---

## 前言

2019 年我写过一篇 Lerna + Yarn Workspaces 的 Monorepo 入门，当时这套组合是社区的标配。时代变了：Lerna 在 2022 年经历过维护交接（后续由 Nx 团队接手），而 Yarn/ npm/pnpm 的 workspace 能力持续增强，社区也明显转向更原生、可组合的方案。

今天，如果你要从零搭建一个 Monorepo，答案已经非常清晰：**pnpm workspace + Changesets + Turborepo**。三个工具各司其职，组合出来的体验远超当年的 Lerna。

---

## 一、Lerna 的兴衰

### 1.1 Lerna 做对了什么

Lerna 2017 年发布，解决了当时前端 Monorepo 的核心痛点：

- 跨包依赖的本地 link（`lerna bootstrap`）
- 统一的版本管理（Fixed 模式，所有包同一版本号）
- 批量发布（`lerna publish`）
- 按拓扑序执行脚本（`lerna run build --sort`）

### 1.2 为什么它过时了

1. **npm/Yarn workspace 原生化**：包管理器自身解决了 hoisting 和 link 问题，`lerna bootstrap` 变得多余
2. **性能**：Lerna 的任务执行没有缓存，大型仓库每次全量重跑
3. **维护范式变化**：2022 年后 Lerna 转入新的维护模式（由 Nx 团队接手），但很多团队已迁移到包管理器原生 workspace + 独立任务编排工具
4. **pnpm 的崛起**：pnpm workspace 协议更严格、更高效，天然防幽灵依赖

```
# 2019 年的 Lerna 工作流
lerna bootstrap      # 安装依赖 + 建立 link
lerna run build      # 所有包执行 build（无缓存，每次全量）
lerna version        # 交互式选版本
lerna publish        # 发布
```

---

## 二、pnpm workspace 原生 Monorepo

### 2.1 基础结构

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json
├── packages/
│   ├── ui/
│   │   ├── package.json
│   │   └── src/
│   ├── utils/
│   │   ├── package.json
│   │   └── src/
│   └── config/
│       └── package.json
└── apps/
    ├── web/
    │   └── package.json
    └── docs/
        └── package.json
```

### 2.2 pnpm-workspace.yaml

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
```

### 2.3 workspace: 协议

pnpm 的 `workspace:` 协议是它最重要的特性之一：

```json
// apps/web/package.json
{
  "name": "@myorg/web",
  "dependencies": {
    "@myorg/ui": "workspace:*",
    "@myorg/utils": "workspace:^1.0.0"
  }
}
```

- `workspace:*` — 总是使用本地最新版本
- `workspace:^1.0.0` — 发布时替换为 `^1.0.0`
- `workspace:~` — 发布时替换为 `~currentVersion`

**与 Yarn 的关键区别**：pnpm workspace 不做 hoisting（或严格限制），每个包都有自己的 `node_modules`，不会出现幽灵依赖（访问未声明的包）。

### 2.4 根目录 package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev": "turbo run dev --parallel"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "@changesets/cli": "^2.27.0"
  }
}
```

### 2.5 常用命令

```bash
# 在特定包中执行命令
pnpm --filter @myorg/ui build
pnpm --filter @myorg/web dev

# 在所有包中执行
pnpm -r build

# 为特定包添加依赖
pnpm --filter @myorg/web add react react-dom

# 添加工作区内部依赖
pnpm --filter @myorg/web add @myorg/ui --workspace
```

---

## 三、Changesets：版本管理与 CHANGELOG 自动化

[Changesets](https://github.com/changesets/changesets) 是目前 Monorepo 版本管理的最佳工具，被 Radix UI、Emotion、SWR 等知名项目使用。

### 3.1 安装与初始化

```bash
pnpm add -D @changesets/cli -w  # -w 安装到根目录
pnpm changeset init
```

初始化后会生成 `.changeset/config.json`：

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted", // 改为 "public" 如果包要发布到 npm
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@myorg/web", "@myorg/docs"] // app 包不发布
}
```

### 3.2 工作流程

**Step 1：开发者完成一个功能后，创建 changeset**

```bash
pnpm changeset
```

交互式提示：

```
🦋 Which packages would you like to include?
  ◯ @myorg/ui
  ◉ @myorg/utils  ← 选择本次修改影响的包

🦋 Which packages should have a major bump?
🦋 Which packages should have a minor bump?
  ◉ @myorg/utils  ← 选择版本号类型

Please enter a summary for this change:
  Add formatDate utility function  ← 写描述

✅ Changeset added! - .changeset/funny-name-123.md
```

生成的 `.changeset/funny-name-123.md`：

```markdown
---
"@myorg/utils": minor
---

Add formatDate utility function
```

**Step 2：将 changeset 文件提交到仓库（随同 PR 提交）**

**Step 3：发版时消费所有 changeset**

```bash
# 更新版本号、生成 CHANGELOG、删除 changeset 文件
pnpm changeset version

# 发布到 npm
pnpm changeset publish
```

### 3.3 与 GitHub Actions 集成

[changesets/action](https://github.com/changesets/action) 可以自动化整个发版流程：

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

这个 Action 会：

- 有待发布的 changeset 时，自动创建/更新一个 "Version Packages" PR
- PR 合并后，自动发布到 npm

---

## 四、Turborepo：任务缓存与并行调度

[Turborepo](https://turbo.build/repo) 是 Vercel 出品的 Monorepo 任务运行器，核心价值在于**智能缓存和并行执行**。

### 4.1 安装与配置

```bash
pnpm add -D turbo -w
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"], // 先构建依赖包
      "outputs": ["dist/**"] // 缓存这些输出
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "persistent": true, // 长期运行的任务
      "cache": false
    }
  }
}
```

`^build` 的含义：运行当前包的 `build` 之前，先运行所有**依赖包**的 `build`。这确保了正确的拓扑执行顺序。

### 4.2 本地缓存

Turborepo 会哈希输入文件 + 环境变量，如果哈希值没变，直接从缓存恢复输出：

```bash
$ turbo run build

# 第一次运行（无缓存）
• Packages in scope: @myorg/ui, @myorg/utils, @myorg/web
• Running build in 3 packages
@myorg/utils:build: cache miss, executing...  # 实际构建
@myorg/ui:build: cache miss, executing...
@myorg/web:build: cache miss, executing...

Tasks:    3 successful, 3 total
Time:     12.4s

# 第二次运行（有缓存，代码未变）
@myorg/utils:build: cache hit, replaying output...  # 直接恢复
@myorg/ui:build: cache hit, replaying output...
@myorg/web:build: cache hit, replaying output...

Tasks:    3 successful, 3 total
Time:     0.4s  ← 从 12.4s 降到 0.4s
```

### 4.3 远程缓存

缓存可以共享给整个团队和 CI：

```bash
# 登录 Vercel（或自建 Remote Cache）
npx turbo login
npx turbo link  # 关联到 Vercel 项目
```

```json
// turbo.json
{
  "remoteCache": {
    "enabled": true
  }
}
```

CI 第一个人跑完 build，其他人的 CI 直接命中远程缓存，无需重新构建。

### 4.4 Turborepo vs Nx 选型

| 维度             | Turborepo               | Nx                                 |
| ---------------- | ----------------------- | ---------------------------------- |
| **学习曲线**     | 低，配置简单            | 中高，概念较多                     |
| **缓存**         | 本地 + 远程（Vercel）   | 本地 + 远程（Nx Cloud）            |
| **代码生成**     | 无（需手写）            | 内置 generator                     |
| **插件生态**     | 较少                    | 丰富（Angular、React、Next.js 等） |
| **适用场景**     | 轻量 Monorepo，前端为主 | 复杂企业级，需要脚手架和约束       |
| **与 pnpm 集成** | 原生支持                | 支持，但默认推 npm/yarn            |

**推荐**：如果只是管理几个前端包，Turborepo 足够了；如果需要跨语言、代码生成、严格的架构约束，选 Nx。

---

## 五、完整 Monorepo 目录结构示例

```
my-monorepo/
├── .changeset/
│   └── config.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── apps/
│   ├── web/                    # Next.js 应用
│   │   ├── package.json
│   │   └── src/
│   └── docs/                   # VitePress 文档站
│       └── package.json
├── packages/
│   ├── ui/                     # 组件库（发布到 npm）
│   │   ├── package.json
│   │   ├── src/
│   │   └── dist/
│   ├── utils/                  # 工具函数（发布到 npm）
│   │   └── package.json
│   └── config/                 # 共享配置（不发布）
│       ├── eslint/
│       │   └── index.js
│       ├── typescript/
│       │   └── base.json
│       └── tailwind/
│           └── base.js
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── pnpm-lock.yaml
```

### 5.1 共享 TypeScript 配置

```json
// packages/config/typescript/base.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

```json
// packages/ui/tsconfig.json
{
  "extends": "@myorg/config/typescript/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

### 5.2 共享 ESLint 配置（ESLint 9 flat config）

```javascript
// packages/config/eslint/index.js
import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";

export default [
  js.configs.recommended,
  {
    plugins: { "@typescript-eslint": typescript },
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
```

```javascript
// apps/web/eslint.config.js
import baseConfig from "@myorg/config/eslint";
export default [
  ...baseConfig,
  {
    /* web specific rules */
  },
];
```

---

## 六、CI 中的增量构建

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Turborepo 需要完整 git 历史来计算 diff

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Build & Test (with Turborepo cache)
        run: turbo run build test lint
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

---

## 七、从 Lerna 迁移指南

### 7.1 卸载 Lerna

```bash
pnpm remove lerna -w
```

### 7.2 迁移 lerna.json 配置

```json
// 旧 lerna.json
{
  "version": "independent",
  "npmClient": "yarn",
  "useWorkspaces": true,
  "packages": ["packages/*"]
}
```

对应关系：

- `"packages": ["packages/*"]` → `pnpm-workspace.yaml`
- `"version": "independent"` → Changesets 默认就是 independent 模式
- `"npmClient": "yarn"` → 迁移到 pnpm

### 7.3 迁移 lerna 命令

| Lerna 命令                  | 新工具命令                            |
| --------------------------- | ------------------------------------- |
| `lerna bootstrap`           | `pnpm install`（自动 workspace link） |
| `lerna run build`           | `turbo run build`                     |
| `lerna version`             | `pnpm changeset version`              |
| `lerna publish`             | `pnpm changeset publish`              |
| `lerna add pkg --scope=app` | `pnpm --filter app add pkg`           |
| `lerna exec -- rm -rf dist` | `pnpm -r exec rm -rf dist`            |

---

## 总结

现代 Monorepo 的三件套各有分工：

- **pnpm workspace**：依赖管理，替代 Lerna bootstrap，严格的依赖隔离
- **Changesets**：版本号管理与发布，替代 `lerna version` + `lerna publish`，CHANGELOG 自动生成
- **Turborepo**：任务编排，替代 `lerna run`，智能缓存大幅提升 CI 速度

从 Lerna 迁移并不难，主要工作量在于调整 CI 脚本和团队习惯。一旦迁移完成，构建速度和开发体验都会有显著提升。

---

## 参考资料

- [pnpm Workspaces 文档](https://pnpm.io/workspaces)
- [Changesets 官方文档](https://github.com/changesets/changesets/tree/main/docs)
- [Turborepo 官方文档](https://turbo.build/repo/docs)
- [Turborepo vs Nx 对比](https://turbo.build/repo/docs/crafting-your-repository/structuring-a-repository)
- [Why I switched from Lerna + Yarn to pnpm + Turborepo](https://betterprogramming.pub/nx-vs-turborepo-vs-lerna-which-is-right-for-your-monorepo-5c5a26a2d5a)
