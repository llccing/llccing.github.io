---
pubDatetime: 2026-04-18T11:23:19+08:00
title: Angular SSR、Hydration 与 BFF：从零理清架构知识点
slug: angular-ssr-hydration-bff
featured: false
draft: false
tags: ["angular", "hydration", "ssr"]
description: Angular 的易混知识点
---

> 这个内容主要来自一个Angular的 [issue](https://github.com/angular/angular/issues/68014)，了解issue的过程中，对于之前不懂的知识点有了新的了解。

# Angular SSR、Hydration 与 BFF：从零理清架构知识点

## 一、一个网页是怎么显示出来的

浏览器要显示网页，最终需要的是 **HTML**。HTML 可以通过两种方式产生：

### CSR（Client Side Rendering）—— 浏览器自己画

```
浏览器请求 → 拿到一个几乎空白的 HTML + 一堆 JS
→ JS 在浏览器里执行 → JS 创建 DOM → 页面出来
```

- 优点：前后端彻底分离，开发简单
- 缺点：JS 没下完之前用户看到白屏；搜索引擎抓不到内容

### SSR（Server Side Rendering）—— 服务器先画好

```
浏览器请求 → 服务器运行 Angular，生成完整 HTML → 返回给浏览器
→ 浏览器直接显示 → 用户立刻看到内容
```

- 优点：首屏快，SEO 友好
- 缺点：服务器压力更大，开发复杂度上升

---

## 二、SSR 的问题：页面"能看不能用"

服务器返回的 HTML 只是**静态**的——它能看，但不能交互。

比如页面上有个 `<button>`，服务器输出的 HTML 里确实有，但点了没反应，因为事件监听还没绑上去。

要让页面"活起来"，浏览器还是要下载 Angular 的 JS 并执行。

问题来了：**Angular 启动后，它要不要把页面重新画一遍？**

- **不用 Hydration**：Angular 把服务器给的 DOM 全部丢掉，自己从零重建。用户看到页面"闪"一下。
- **用 Hydration**：Angular 发现页面里已经有服务器画好的 DOM，直接"接管"它——把事件绑上去、把组件实例挂上去，不重画。

> **Hydration = Angular 在浏览器启动时，复用服务器已有的 DOM，而不是重建它。**

---

## 三、Hydration 的使用场景

### 适合用 Hydration

| 场景                               | 原因                                               |
| ---------------------------------- | -------------------------------------------------- |
| 首屏体验很重要（官网、电商详情页） | 用户一打开就要看到内容，不能白屏等 JS              |
| SEO 很重要                         | 搜索引擎更容易读取服务端已输出的 HTML              |
| 弱网或低性能设备较多               | 先给 HTML，用户更早看到内容                        |
| 页面结构稳定，首屏内容明确         | 服务端产出的 DOM 和客户端预期一致，不容易 mismatch |

### 不太适合 Hydration

| 场景                        | 原因                                      |
| --------------------------- | ----------------------------------------- |
| 纯后台管理系统              | SEO 不重要，首屏没那么极端，纯 CSR 更简单 |
| 首屏重度依赖浏览器专属 API  | `window`、Canvas、WebGL 等在服务端不存在  |
| 首屏 DOM 会被客户端立刻大改 | 容易发生 hydration mismatch               |

---

## 四、Angular 中的三种"服务端参与"模式

### 1. 实时 SSR

每次请求到达服务器时，Angular 实时运行组件逻辑，生成 HTML 并返回。

```ts
{ path: "**", renderMode: RenderMode.Server }
```

### 2. 预渲染（Prerender）

在 `ng build` 构建阶段就提前生成好 HTML 文件，请求到来时直接返回。

```ts
{ path: "**", renderMode: RenderMode.Prerender }
```

### 3. 纯客户端

不做服务端渲染，和传统 CSR 一样。

```ts
{ path: "**", renderMode: RenderMode.Client }
```

> **Hydration 配合的是前两种模式。** 只有先存在服务端产出的 HTML，客户端才有东西可以"接管"。

---

## 五、一个 Angular SSR + Hydration 项目的完整流程

以本项目为例：

### 构建阶段

`angular.json` 配置了 `outputMode: "server"`，`main.server.ts` 配置了 `RenderMode.Prerender`。
Angular CLI 执行 `ng build` 时，先走一遍服务端渲染逻辑，提前生成好 HTML。

### 用户打开页面

```
1. 浏览器请求 http://localhost:4200
2. 服务端把预渲染好的 HTML 返回
3. 浏览器直接显示（用户立刻看到标题和按钮）

   此时页面能看，但按钮点了没反应。
```

### Angular 客户端启动

```
4. 浏览器同时下载 Angular JS
5. JS 加载完后执行 main.ts：
   bootstrapApplication(App, {
     providers: [provideClientHydration(withEventReplay())],
   })
6. Angular 进入 hydration 流程：
   - 不重建 DOM
   - 把组件实例和已有 DOM 节点对应起来
   - 把 (click)="insert2()" 事件绑定到按钮上
7. 页面变成"可交互"的
```

### 用户点击按钮

```
8. 执行 this.anchor().vcr.createComponent(Portal)
   这是普通的运行时操作，hydration 已经完成
```

---

## 六、关键 API 说明

### `provideClientHydration()`

在 `main.ts`（客户端入口）中调用。告诉 Angular：启动时不要重建 DOM，而是接管服务端已有的 DOM。

```ts
// src/main.ts
bootstrapApplication(App, {
  providers: [provideClientHydration(withEventReplay())],
});
```

### `withEventReplay()`

解决一个时间差问题：

```
服务器返回 HTML → 用户看到按钮 → 用户点了按钮
→ 但 Angular JS 还没加载完 → 点击丢失
```

`withEventReplay()` 会把 hydration 完成前的用户事件记录下来，等 hydration 完成后重新触发。
它和数据获取、BFF 没有任何关系，只是 hydration 的一个增强功能。

### `provideServerRendering()`

在 `main.server.ts`（服务端入口）中调用。配置服务端渲染能力和路由规则。

```ts
// src/main.server.ts
const config: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideServerRendering(withRoutes(serverRoutes)),
  ],
};
```

---

## 七、项目中各文件的职责

| 文件                 | 职责                                                 |
| -------------------- | ---------------------------------------------------- |
| `src/main.ts`        | 客户端入口，启动 Angular 应用，开启 hydration        |
| `src/main.server.ts` | 服务端入口，配置 SSR/预渲染规则                      |
| `src/server.ts`      | Express 服务器，承载 HTTP 请求，把 HTML 返回给浏览器 |
| `src/app/app.ts`     | 应用组件，包含页面逻辑和模板                         |
| `angular.json`       | 项目构建配置，声明 `outputMode`、SSR 入口等          |

---

## 八、BFF 是什么

BFF = **Backend For Frontend**，专门为前端组织数据的中间层服务。

它和 SSR/Hydration 不在同一个维度：

- SSR/Hydration 解决的是 **"页面怎么渲染出来"**
- BFF 解决的是 **"前端怎么拿到数据"**

### 没有 BFF 时

假设页面需要：用户名、订单列表、推荐商品，分散在 3 个后端服务里。

```
浏览器 → 用户服务（拿用户名）
浏览器 → 订单服务（拿订单）
浏览器 → 推荐服务（拿推荐）
```

前端发 3 个请求，处理 3 种接口格式。

### 有 BFF 时

```
浏览器 → BFF（一个请求）
BFF → 用户服务 + 订单服务 + 推荐服务（内部聚合）
BFF → 浏览器（返回一份整理好的 JSON）
```

前端只发 1 个请求，拿到的数据格式刚好是页面需要的。

### BFF 的核心能力

- **聚合**：把多个后端接口合成一个
- **裁剪**：只返回前端需要的字段
- **适配**：把后端数据转换成页面友好的结构
- **鉴权**：统一处理认证和权限
- **缓存**：减少对后端的重复请求

---

## 九、SSR/Hydration 与 BFF 的对比

|                    | SSR + Hydration                      | BFF                      |
| ------------------ | ------------------------------------ | ------------------------ |
| **解决什么**       | 页面怎么更快显示、怎么被搜索引擎抓到 | 前端怎么更方便地拿到数据 |
| **输出什么**       | HTML                                 | JSON                     |
| **谁消费**         | 浏览器（渲染页面）                   | 前端代码（获取数据）     |
| **必须用 Node 吗** | Angular SSR 需要 Node                | 不一定，任何语言都行     |
| **互相依赖吗**     | 不依赖                               | 不依赖                   |

它们可以**独立使用**，也可以**组合使用**：

| 组合                           | 典型场景                         |
| ------------------------------ | -------------------------------- |
| 只有 SSR + Hydration，没有 BFF | 简单官网、博客、本项目           |
| 只有 BFF，没有 SSR             | 后台管理系统                     |
| SSR + Hydration + BFF          | 大型面向用户的站点（电商、门户） |
| 都没有                         | 最简单的纯前端 SPA               |

---

## 十、Node 在这里扮演什么角色

Node 只是一个运行时，不等于 BFF，也不等于 SSR。

| 角色                      | 说明                                                                           |
| ------------------------- | ------------------------------------------------------------------------------ |
| **SSR 宿主**              | Node 运行 Angular 服务端渲染逻辑，生成 HTML。本项目的 `server.ts` 就是这个角色 |
| **BFF**                   | Node 聚合后端接口、返回 JSON。本项目没有这个角色                               |
| **既是 SSR 宿主又是 BFF** | 同一个 Express 里既有 SSR 逻辑又有 `/api/*` 接口。大型项目常见                 |

判断方法：看 Node 层主要在做什么。

- 主要在调用 Angular SSR 引擎、返回 HTML → **SSR 宿主**
- 主要在聚合后端服务、返回 JSON → **BFF**
- 两者都有 → **SSR + BFF**

---

## 十一、`ng serve` 与生产部署

### 开发模式：`ng serve`

Angular CLI 的开发服务器，默认监听 **4200** 端口。
它会自动处理 SSR 请求（利用 `server.ts` 导出的 `reqHandler`），不需要你手动启动 Express。

### 生产模式：`ng build` + 部署

构建产物取决于 `angular.json` 中的 `outputMode`：

| outputMode | 产物                       | 部署方式                           |
| ---------- | -------------------------- | ---------------------------------- |
| `"static"` | 纯 HTML/CSS/JS 静态文件    | Nginx / CDN 直接托管               |
| `"server"` | Node 服务端代码 + 静态资源 | 需要 Node 进程运行（PM2 / Docker） |

**本项目的 `outputMode` 是 `"server"`**，所以生产环境需要一个 Node 进程来运行。

### PM2 和 Nginx 不是二选一

|          | Nginx                                   | PM2                                      |
| -------- | --------------------------------------- | ---------------------------------------- |
| 做什么   | 反向代理、HTTPS、静态资源缓存、负载均衡 | 管理 Node 进程，自动重启、日志、集群模式 |
| 处理什么 | 所有入站请求的第一道门                  | 只负责让 Node 进程活着                   |

生产环境最常见的做法是**一起用**：

```
用户请求 → Nginx（反向代理 + HTTPS + 静态资源）
         → PM2 管理的 Node 进程（处理 SSR 请求）
```

> **需不需要 Node 进程，取决于 `outputMode` 是不是 `"server"`，而不是有没有 hydration。**
> Hydration 发生在浏览器里，和服务端用什么部署方式无关。

---

## 十二、ViewContainerRef.createComponent() 与 Hydration 的关系

本项目中的这行代码：

```ts
this.anchor().vcr.createComponent(Portal);
```

它本身**不是 hydration API**，而是 Angular 的动态组件创建能力。

### 为什么它容易和 hydration 冲突

- Hydration 需要客户端 DOM 和服务端 DOM 保持一致
- `createComponent()` 会直接插入新的 DOM 节点
- 如果在 hydration 尚未完成时执行，Angular 会发现"DOM 跟预期不一样"，触发 mismatch 错误

### 安全的时机 vs 危险的时机

| 时机                           | 风险                                |
| ------------------------------ | ----------------------------------- |
| 按钮点击后创建（本项目的做法） | 低风险，hydration 早已完成          |
| 构造函数或 `ngOnInit` 中创建   | 高风险，可能在 hydration 过程中执行 |
| `afterNextRender` 中创建       | 安全，确保在客户端渲染完成后执行    |

---

## 十三、总结架构图

```
┌──────────────────────────────────────────────┐
│                 渲染维度                       │
│                                              │
│   服务端生成 HTML（SSR / 预渲染）               │
│         ↓                                    │
│   浏览器显示 HTML                              │
│         ↓                                    │
│   Angular 接管 DOM（Hydration）                │
│         ↓                                    │
│   页面可交互                                   │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│                 数据维度                       │
│                                              │
│   前端需要数据                                 │
│         ↓                                    │
│   请求 BFF（或直接请求后端）                     │
│         ↓                                    │
│   BFF 聚合多个后端服务                          │
│         ↓                                    │
│   返回 JSON 给前端                             │
└──────────────────────────────────────────────┘

两个维度独立存在，可以单独用，也可以组合用。
```
