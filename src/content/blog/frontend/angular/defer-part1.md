---
pubDatetime: 2026-05-30T14:24:17+08:00
title: "[译] Understanding Angular's deferrable views - Part. 1"
slug: defer-part1
featured: false
draft: true
isTranslation: true
tags:
  - angular
  - lazy-loading
  - performance
description: "@defer 是街区里的新酷孩子"
canonicalURL: https://riegler.fr/blog/2023-10-05-defer-part1
---

> 原文地址: https://riegler.fr/blog/2023-10-05-defer-part1

延迟加载是目前构建应用程序时的一个热门话题。延迟加载越多，主包就会越小。 Angular v17 引入了可延迟视图，这是一种从模板延迟加载组件的方法。

让我们深入了解一下吧！

## @defer 块

### 基础知识

模板可延迟视图由 `@defer() { ... }` 块包装。该块指示编译器提取其内容并在触发特定触发器时延迟加载它。

`@defer` 语法很简单，如下所示：

#### **`app.component.html`**

```
<div>
  @defer {
    <app-child />
  }
</div>
```

这里，只要应用程序空闲（默认触发器），`AppComponent` 就会延迟加载 `app-child` 组件。
当服务/构建您的应用程序时，您将能够在控制台中看到以下日志（
如果使用 `namedChunk` 构建器选项，则保留组件名称）：

```
Lazy Chunk Files               | Names         |  Raw Size
appchild.component-UIYBMU37.js | -             |   1.62 kB |
```

### 触发器

对于 v17 版本，`@defer` 附带了一组受支持的条件和触发器，用于确定何时触发组件的加载。

| 触发             | 详情                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| 何时可见         | 此条件先于触发器。它可以是变量、函数调用、管道值等。在撰写本文时，不支持 `Observable` 和 `AsyncPipe` |
| 空闲时           | 这是默认行为，当应用程序空闲时触发（使用 `requestIdleCallback`）                                     |
| 立即             | 执行模板时触发器立即触发                                                                             |
| 定时器（5s）     | 基于 `setTimeout` 的触发器，如果​​指定了 `s`，则以毫秒或秒为单位                                     |
| 交互（触发）     | 单击模板引用，其中 `#trigger` 是模板引用                                                             |
| 悬停时（触发）   | 将鼠标悬停在模板引用上，其中 `#trigger` 是模板引用                                                   |
| 在视口（容器）上 | 在进入视口的模板上，其中 `#container` 是模板引用                                                     |

所有这些触发器都可以组合在一条 @defer 指令中，并用逗号分隔。

```
<div>
  @defer(on viewport(container), idle) {
    <app-child />
  }
</div>
```

## 预取

触发器非常适合触发组件的动态加载。但是如果我们想通过预取导入的文件来加快数据获取速度怎么办？

这就是 `@defer` 块中 `prefetch` 选项的用途。
`prefetch` 可以采用一组条件 (`when ...`) 和触发器 (`on ...`) 来确定何时触发动态导入的 js 模块的实际加载。

```
@defer (on viewport(container); prefetch on timer(5s);  prefetch when isDataLoaded()){
  <app-child />
}
```

这样，组件加载会在数据加载后或 5 秒后开始，但只有在其容器进入视口时才会渲染！

很棒不是吗？ 🚀

## @defer，渲染直到什么？

在我们的组件被加载和渲染之前，我们可能需要填充一个占位符。这是通过定义一个
`@placeholder` 块位于 `defer` 块之后。占位符将在 DOM 中呈现，直到延迟触发器触发。
占位符接受单个参数 `minimum`，这是触发延迟触发器后显示的最短时间。

如果我们想在占位符进入视口时触发，它会非常有用。

#### **`mycomponent.template.html`**

```
@defer(on viewport(myPlaceholder)) {
    <app-child />
} @placeholder(minimum 5000ms) {
    <div #myPlaceholder>...</div>
}
```

由于延迟加载可能不是即时的（巨大的组件，缓慢的网络），我们可能希望显示一个加载块。
这就是 `@loading` 块的用途。与 `@placeholder` 一样，它接受 `minimum` 参数，但也接受 `after` 参数。

如果延迟加载失败，我们可以通过使用 `@error` 块定义它来呈现错误消息。错误块不带参数；

```
@defer(on viewport(myPlaceholder)) {
   <app-child />
} @loading (minimum 1s; after 100ms){
  Loading...
} @error {
  Loading failed :(
}
```

`@placeholder`、`@loading` 和 `@error` 块的内容被急切加载。

## 用法

这是一个完整的（拥挤的）示例，展示了 defer 的可能性以及我们迄今为止看到的每个功能：

- `when` 条件
- `on` 触发器
- `prefetch` 触发器
- `@placeholder` 块
- `@loading` 块
- `@error` 块

#### **`mycomponent.template.html`**

```
@defer (when isVisible() && foo;
        on hover(button), timer(10s), idle, immediate, interaction(button), viewport(container);
        prefetch on immediate; prefetch when isDataLoaded()) {
  <calendar-cmp [date]="current"/>
}
@placeholder (minimum 500){
  Placeholder content!
}
@loading (minimum 1s; after 100ms){
  Loading...
}
@error {
  Loading failed :(
}
```

这里为您准备了 [stackblitz playground](https://stackblitz.com/edit/angular-at?file=src%2Fmain.ts)，让您可以开始使用这个令人惊叹的新功能！

## 待定

在下一篇文章中，我们将深入探讨可延迟视图的技术细节。它们如何工作、如何使用它们并针对它们优化您的模板。敬请关注。

编辑：第 2 部分可用 [here](blog/2023-10-08-defer-part2)
