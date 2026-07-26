# Angular 核心贡献者博客资源整理

> 整理时间：2026-05-30
> 来源：基于 GitHub Angular 仓库核心贡献者调研

---

## 一、已排除的贡献者

**Matthieu Riegler**（[@Jean-Mèche](https://github.com/jeanmeche)）
- 博客：[riegler.fr](https://riegler.fr)
- 专注于 Angular Signals、变更检测、构建工具等核心机制的深度分析

---

## 二、其他 5 位核心贡献者

| 贡献者 | GitHub | 身份 | 博客 |
|--------|--------|------|------|
| Minko Gechev | [@mgechev](https://github.com/mgechev) | 前 Angular PM，现 Google | [blog.mgechev.com](https://blog.mgechev.com) |
| Netanel Basal | [@NetanelBasal](https://github.com/NetanelBasal) | ngneat 创始人，FrontEnd Tech Lead | [medium.com/netanelbasal](https://medium.com/netanelbasal)（需梯子） |
| Tim Deschryver | [@timdeschryver](https://github.com/timdeschryver) | NgRx 团队成员 | [timdeschryver.dev/blog](https://timdeschryver.dev/blog) |
| Tomas Trajan | [@tomastrajan](https://github.com/tomastrajan) | Angular CLI 贡献者 | [medium.com/@tomastrajan](https://medium.com/@tomastrajan)（需梯子） |
| Pawel Kozlowski | [@pkozlowski-opensource](https://github.com/pkozlowski-opensource) | ng-bootstrap 作者 | 无独立博客 |

> ⚠️ medium.com 国内无法直接访问（403），建议通过 RSS 或镜像工具订阅。

---

## 三、精选文章列表

### 📍 riegler.fr — 深度机制解析

| 文章标题 | 链接 | 简介 |
|----------|------|------|
| Signal 使用决策图 | [🔗](https://riegler.fr/blog/2025-01-12-signal-decision-chart) | 什么场景用什么 Signal API 的速查图 |
| Lifecycle Hook 免用写法 | [🔗](https://riegler.fr/blog/2024-12-31-lifecycle-hook-less) | 用现代 API 替代传统生命周期钩子 |
| inject() 不是服务定位器 | [🔗](https://riegler.fr/blog/2025-01-08-inject-not-service-locator) | 正确理解 inject() 的使用边界 |
| Angular 模板渲染性能原理 | [🔗](https://riegler.fr/blog/2025-02-16-incremental-dom) | 声明式模板到 DOM 的渲染过程 |
| Zoneless 混合变更检测 v18 | [🔗](https://riegler.fr/blog/2024-04-17-zoneless-with-zoneless-hybrid) | Zone.js 与 Zoneless 的混合模式 |
| @defer 懒加载解析 Part 1 | [🔗](https://riegler.fr/blog/2023-10-05-defer-part1) | @defer 基础用法与场景 |
| @defer 内部实现 Part 2 | [🔗](https://riegler.fr/blog/2023-10-08-defer-part2) | @defer 的运行时机制 |
| Inputs 和 Outputs 的不对称性 | [🔗](https://riegler.fr/blog/2025-04-05-input-output) | Output 不是状态，与 Input 有本质区别 |

---

### 📍 blog.mgechev.com — 工程思想与前沿趋势

| 文章标题 | 链接 | 简介 |
|----------|------|------|
| 200 行 JS 实现响应式框架 | [🔗](https://blog.mgechev.com/2025/01/09/minimal-reactive-framework/) | 从零理解 Signals 响应式原理 |
| LLM-first Web 框架设想 | [🔗](https://blog.mgechev.com/2025/04/19/llm-first-web-framework/) | AI 时代的 Web 框架应该怎么设计 |
| Managing Angular（工程管理视角） | [🔗](https://blog.mgechev.com/2024/08/25/managing-angular/) | 大型 Angular 项目的工程管理经验 |
| Prefetching 启发式策略 | [🔗](https://blog.mgechev.com/2021/02/07/prefetching-strategies-heuristics-faster-web-apps/) | 基于用户行为的智能预加载策略 |
| 5 个你不知道的 Angular CLI 功能 | [🔗](https://blog.mgechev.com/2019/02/06/5-angular-cli-features/) | Angular CLI 高效使用技巧 |

---

### 📍 timdeschryver.dev — 测试与 NgRx 实战

| 文章标题 | 链接 | 简介 |
|----------|------|------|
| Angular Testing Library Zoneless | [🔗](https://timdeschryver.dev/blog/introducing-angular-testing-library-zoneless) | 无 Zone.js 的现代组件测试方案 |
| Angular Signal Forms v21.2 新特性 | [🔗](https://timdeschryver.dev/blog/angular-signal-forms-keeps-improving) | Signal Forms 最新 API 一览 |

---

### 📍 angular.love — 社区实战文章

| 文章标题 | 链接 | 简介 |
|----------|------|------|
| Guards & Resolvers 路由控制 | [🔗](https://angular.love/guards-and-resolvers-controlling-navigation-flow) | 路由守卫与数据预加载的完整用法 |
| Nx Monorepo 可扩展前端架构 | [🔗](https://angular.love/beyond-clean-code-building-a-scalable-angular-frontend-architecture-with-nx-monorepos) | 超越 Clean Code，用 Nx 构建大型架构 |

---

## 四、推荐精读顺序

1. 🥇 **[200 行实现响应式框架](https://blog.mgechev.com/2025/01/09/minimal-reactive-framework/)** — 理解 Signals 底层原理的最佳入门
2. 🥈 **[Signal 决策图](https://riegler.fr/blog/2025-01-12-signal-decision-chart)** — 实用速查，解决日常选择困难
3. 🥉 **[Lifecycle Hook 免用写法](https://riegler.fr/blog/2024-12-31-lifecycle-hook-less)** — Modern Angular 最佳实践，代码风格升级必读
