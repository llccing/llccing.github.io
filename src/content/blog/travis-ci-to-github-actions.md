---
pubDatetime: 2026-05-01T13:00:00Z
title: 从 Travis CI 迁移到 GitHub Actions：2026 年的前端自动化部署实战
slug: travis-ci-to-github-actions
featured: false
draft: false
tags:
  - ci-cd
  - github-actions
  - devops
  - frontend
description: Travis CI 曾是开源项目的 CI 首选，但 2021 年的收费政策变化让大量项目流失。本文详解如何把 .travis.yml 迁移到 GitHub Actions，并介绍 pnpm 缓存、Secrets、矩阵构建等实用技巧。
---

## 前言

2018 年我写过一篇 Travis CI 配置教程，当时它是开源项目的 CI 标配，免费额度慷慨，与 GitHub 集成流畅。

2021 年，Travis CI 更换了收费策略，免费用户的构建额度从"无限"改为"有限积分"，耗尽即停。大量开源项目在毫无预兆的情况下 CI 停摆，社区因此掀起了集体迁移浪潮。

受益最大的是 **GitHub Actions**——它由 GitHub 官方维护，与 GitHub 生态深度集成，在前端与开源项目中已经成为最常见的 CI/CD 方案之一。

---

## 一、Travis CI 的落幕

### 1.1 收费事件时间线

- **2020 年**：Idera 收购 Travis CI
- **2021 年 6 月**：公开仓库停止免费套餐，改为"积分制"，新账户仅有 10,000 积分（约几十次构建）
- **2021 年下半年**：大规模项目迁移，包括 Vue.js、Ruby on Rails、Jest 等
- **2022 年至今**：Travis CI 在开源前端社区中的存在感明显下降，迁移到 GitHub Actions 的项目持续增多

### 1.2 GitHub Actions 为什么赢

- **免费额度**：公开仓库无限制；私有仓库每月 2,000 分钟（免费计划）
- **零配置集成**：无需配置 OAuth，直接读取仓库，Secrets 在仓库 Settings 中管理
- **Marketplace**：数千个现成 Action，覆盖各种场景
- **矩阵构建**：原生支持多维度并行
- **制品（Artifacts）**：内置构建产物存储

---

## 二、GitHub Actions 核心概念速览

理解五个概念就够用：

```
Repository
└── .github/workflows/
    └── deploy.yml          ← Workflow（工作流）

Workflow
├── on: push                ← 触发条件（Event）
└── jobs:
    └── build               ← Job（独立运行环境）
        ├── runs-on: ubuntu-latest
        └── steps:          ← Steps（顺序执行的步骤）
            ├── uses: actions/checkout@v4   ← Action（可复用步骤）
            └── run: pnpm build             ← 直接运行命令
```

- **Workflow**：一个 YAML 文件，定义一套自动化流程
- **Job**：运行在独立虚拟机（runner）上的一组 Steps，默认并行
- **Step**：一个命令（`run`）或一个 Action（`uses`）
- **Action**：可复用的步骤，来自 GitHub Marketplace 或本地
- **Runner**：执行 Job 的服务器，`ubuntu-latest` 是最常用的

---

## 三、等价迁移：.travis.yml → GitHub Actions

### 3.1 典型的 Travis CI 前端配置

```yaml
# .travis.yml（2018 年风格）
language: node_js
node_js:
  - "16"
cache:
  yarn: true
  directories:
    - node_modules

install:
  - yarn install

script:
  - yarn lint
  - yarn test
  - yarn build

deploy:
  provider: pages
  skip_cleanup: true
  github_token: $GITHUB_TOKEN
  local_dir: dist
  on:
    branch: main
```

### 3.2 等价的 GitHub Actions 配置

```yaml
# .github/workflows/deploy.yml
name: CI & Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm" # 自动缓存 pnpm store

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build

      # 只有 push 到 main 才部署（PR 不部署）
      - name: Deploy to GitHub Pages
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 3.3 关键差异对照

| Travis CI                | GitHub Actions                            |
| ------------------------ | ----------------------------------------- |
| `.travis.yml`            | `.github/workflows/*.yml`                 |
| `language: node_js`      | `actions/setup-node@v4`                   |
| `cache: yarn: true`      | `cache: 'pnpm'`（setup-node 内置）        |
| `$GITHUB_TOKEN` 环境变量 | `${{ secrets.GITHUB_TOKEN }}`（自动提供） |
| `on: branch: main`       | `if: github.ref == 'refs/heads/main'`     |
| `before_install`         | 在 `steps` 中加一个 `run` 步骤            |

---

## 四、pnpm 在 GitHub Actions 中的最佳实践

### 4.1 正确的缓存配置

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 10 # 指定 pnpm 版本，避免意外升级

- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: "pnpm" # 缓存 pnpm 的全局 store（~/.pnpm-store）
```

`cache: 'pnpm'` 会缓存 `~/.pnpm-store`（pnpm 的全局内容寻址存储），而不是 `node_modules`。这意味着即使 `node_modules` 不存在，`pnpm install` 也几乎是瞬间完成（直接从缓存 hardlink）。

### 4.2 使用 --frozen-lockfile

```yaml
- run: pnpm install --frozen-lockfile
```

`--frozen-lockfile` 等同于 npm 的 `--ci`：

- 如果 `pnpm-lock.yaml` 不存在或不匹配 `package.json`，报错退出
- 不更新 lockfile（CI 不应该修改 lockfile）
- 速度更快（跳过了锁文件计算）

### 4.3 读取 package.json 中的 packageManager 字段

如果 `package.json` 里有：

```json
{
  "packageManager": "pnpm@10.28.0"
}
```

`pnpm/action-setup` 可以自动读取：

```yaml
- uses: pnpm/action-setup@v4
  # 不需要指定 version，自动从 packageManager 字段读取
```

---

## 五、Secrets 与环境变量管理

### 5.1 内置 Secrets

`GITHUB_TOKEN` 是 GitHub Actions 自动提供的，无需手动配置，拥有仓库的读写权限。

### 5.2 自定义 Secrets

在仓库的 **Settings → Secrets and variables → Actions** 中添加：

```yaml
- name: Build
  run: pnpm build
  env:
    PUBLIC_GA_MEASUREMENT_ID: ${{ secrets.GA_MEASUREMENT_ID }}
    PUBLIC_API_URL: ${{ vars.API_URL }} # vars 是明文变量，secrets 是加密的
```

**原则**：

- 密钥（token、密码）→ Secrets（加密存储，日志中自动掩码）
- 配置值（URL、feature flag）→ Variables（明文，可在日志中查看）

### 5.3 环境（Environments）

对于需要审批的部署（如生产环境），使用 Environments：

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production # 在 Settings 中配置了需要审批
      url: https://myapp.com
    steps:
      - run: pnpm deploy:prod
        env:
          DEPLOY_TOKEN: ${{ secrets.PROD_DEPLOY_TOKEN }}
```

---

## 六、矩阵构建：多版本并行测试

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22] # 并行测试两个 Node 版本
        os: [ubuntu-latest, windows-latest] # 也可以测试多个 OS
      fail-fast: false # 一个版本失败不中断其他版本

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
```

矩阵构建会并行跑 2×2=4 个 Job，大幅缩短总等待时间。

---

## 七、常用部署方案对比

### 7.1 GitHub Pages（静态站）

```yaml
- name: Deploy
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist
    cname: myapp.com # 自定义域名
```

### 7.2 Vercel

```yaml
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    vercel-args: "--prod"
```

### 7.3 Cloudflare Pages

```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    projectName: my-project
    directory: dist
    gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### 7.4 三者对比

|                  | GitHub Pages     | Vercel               | Cloudflare Pages    |
| ---------------- | ---------------- | -------------------- | ------------------- |
| **免费额度**     | 无限（公开仓库） | 慷慨                 | 最慷慨              |
| **CDN**          | GitHub CDN       | Vercel Edge          | Cloudflare 全球 CDN |
| **Preview 部署** | 需自己配置       | 自动（PR 自动部署）  | 自动                |
| **函数/API**     | 无               | Serverless Functions | Workers             |
| **自定义域名**   | 支持             | 支持                 | 支持                |

---

## 八、进阶：Reusable Workflows 与 Composite Actions

### 8.1 Reusable Workflow（跨仓库复用工作流）

```yaml
# .github/workflows/reusable-build.yml
on:
  workflow_call: # 声明为可复用
    inputs:
      node-version:
        required: false
        type: string
        default: "22"
    secrets:
      NPM_TOKEN:
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

```yaml
# 在其他仓库中调用
jobs:
  build:
    uses: myorg/.github/.github/workflows/reusable-build.yml@main
    with:
      node-version: "22"
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 8.2 Composite Action（本地可复用步骤）

```yaml
# .github/actions/setup-pnpm/action.yml
name: Setup pnpm environment
description: Setup Node.js + pnpm with caching

inputs:
  node-version:
    description: Node.js version
    default: "22"

runs:
  using: composite
  steps:
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: "pnpm"
    - run: pnpm install --frozen-lockfile
      shell: bash
```

```yaml
# 在工作流中使用
- uses: ./.github/actions/setup-pnpm
  with:
    node-version: "22"
```

---

## 九、本站（llccing.github.io）的实际 workflow

本站已完成从 Travis CI 到 GitHub Actions 的迁移，实际使用的配置：

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - run: pnpm build
        env:
          PUBLIC_GA_MEASUREMENT_ID: ${{ secrets.GA_MEASUREMENT_ID }}

      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          cname: rowanliu.com
```

配置简洁，整个构建+部署大约 2-3 分钟完成。

---

## 总结

GitHub Actions 取代 Travis CI 不只是工具的替换，更是思维模式的升级——从"在 CI 服务器上运行脚本"到"在 GitHub 生态内编排工作流"。

迁移工作本身并不复杂，大多数项目 1 小时内可以完成。迁移后你会发现：

- 不再需要在 Travis 控制台和 GitHub 之间切换
- Secrets 管理更安全、更直观
- PR Preview、环境审批等高级功能开箱即用

---

## 参考资料

- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [pnpm/action-setup](https://github.com/pnpm/action-setup)
- [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [Migrating from Travis CI](https://docs.github.com/en/actions/migrating-to-github-actions/migrating-from-travis-ci-to-github-actions)
