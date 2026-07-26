---
pubDatetime: 2026-05-30T10:00:00Z
title: "[译] 用约 200 行 JavaScript 构建响应式框架"
slug: minimal-reactive-framework
featured: false
draft: false
isTranslation: true
tags:
  - javascript
  - reactivity
  - web-frameworks
  - angular
description: 用约 200 行 JavaScript 实现一个支持细粒度响应式的极简前端框架，探索组件模型、Signal、渲染器等核心概念。
canonicalURL: https://blog.mgechev.com/2025/01/09/minimal-reactive-framework/
---

> 原文地址: https://blog.mgechev.com/2025/01/09/minimal-reactive-framework/

作者：Minko Gechev · 2025 年 1 月 9 日

我目前的一个项目是[将 Angular 与 Wiz 融合](https://blog.angular.dev/angular-and-wiz-are-better-together-91e633d8cd5a)成同一个框架。这是一个涉及大量工作和众多成员的复杂项目。这也让我开始思考不同的客户端渲染模型。在这篇博客中，我将展示一个非常简单的库，它能让你开发具有细粒度响应式能力的组件。为了便于讨论，我把这个库命名为"revolt"。

你可以在[我的 GitHub 仓库](https://github.com/mgechev/revolt)中找到它的实现。

> 这个原型只是一个有趣的实验，仅此而已！

## 组件模型

revolt 中的每个组件都是一个返回视图的函数。视图由对应页面上 DOM 元素和文本节点的嵌套对象来表示。对于每个 DOM 元素，我们可以指定事件监听器和属性。

以下是 revolt 中一个 "Hello, world!" 组件的写法：

```javascript
const HelloWorld = () => {
  return "Hello, world!";
};
```

以下是一个计时器的写法：

```javascript
const Timer = () => {
  const timer = signal(0);
  setInterval(() => timer.set(timer() + 1), 1000);
  return () => `Timer: ${timer()}`;
};
```

以下是如何组合组件并传递属性的示例：

```javascript
const Avatar = (photo: () => string) => {
  return () => {
    name: 'img',
    attributes: {
      src: photo
    }
  };
};

const UserProfile = () => {
  const userProfile = signal(...);
  return [{
    name: 'h1',
    children: [
      () => `Profile of ${userProfile.name()}`
    ]
  },
  Avatar(userProfile.avatarUrl)
  ];
};
```

有几点值得注意：

- 每个组件都是一个函数，返回代表视图的嵌套对象结构
- 我们在函数体内用 signal 声明每个组件的状态
- 有一种受 React `ref` 启发的方式来获取特定 DOM 节点的引用
- 我们拥有"细粒度响应式"——可以将属性或文本节点绑定到特定的 signal

> 这个实现出于便利而使用了函数。我知道很多人对启用组件定义的抽象方式（例如类、函数、单文件组件）有强烈的个人偏好。作为 Angular 团队成员，我有必要声明：这个原型并不代表我或团队对 Angular 未来开发方式的愿景。

我们可以通过以下方式渲染一个组件：

```javascript
render(Component(), document.body);
```

我决定使用嵌套对象而非 JSX 或模板语言，以简化构建过程并减少抽象层。

## 视图模型

让我们看一看视图的类型定义：

```typescript
export type Binding = string | ReadableSignal<string>;
export type EventListener = <K extends keyof GlobalEventHandlersEventMap>(
  event: GlobalEventHandlersEventMap[K]
) => void;

export interface When {
  condition: ReadableSignal<boolean>;
  then: View;
  else?: View;
}

export interface For<T, I extends Iterable<T> = T[]> {
  collection: ReadableSignal<T>;
  items: (item: T, index: number) => ViewNode;
}

export interface ElementConfig {
  name: keyof HTMLElementTagNameMap;
  attributes?: Record<string, string | ReadableSignal<string | false>>;
  children?: View;
  events?: { [key in keyof GlobalEventHandlersEventMap]?: EventListener };
  ref?: (node: Element) => void;
}

export type ViewNode = Binding | ElementConfig | When | For<any>;

export type View = ViewNode | View[];
```

在编写这些类型时，很有趣的是可以看到它们与[编程语言的文法](https://en.wikipedia.org/wiki/Formal_grammar)有多相似。模板语言本质上就是能渲染 DOM 的编程语言。

每个视图都是节点的组合，节点可以是：

- 文本或文本绑定
- DOM 元素
- 控制流（when、for）

值得注意的是，revolt 没有"[宿主元素](https://angular.dev/guide/components/host-elements)"的概念——一个组件可以产生任意数量的根节点，如果只是渲染一个文本节点，甚至可以产生零个根节点。

另外请注意，`When` 和 `For` 都接受一个可读 signal，当 signal 的值发生变化时会重新渲染。同样，我们可以理解文本和属性绑定中细粒度响应式的实现方式——两者都可以是字符串或 `ReadableSignal`。

## Signal

我们的响应式框架将使用一个极简的 signal 实现，该实现来自["从零开始构建响应式库"](https://dev.to/ryansolid/building-a-reactive-library-from-scratch-1i0p)这篇文章。该库导出三种抽象：`ReadableSignal<T>`、`WritableSignal<T>` 和 `Effect`：

```typescript
export type ReadableSignal<T> = () => T;

export interface WritableSignal<T> extends ReadableSignal<T> {
  set(value: T): void;
}

export type Effect = () => void;
```

以下是它们的使用方式：

```typescript
const counter = signal(0);

effect(() => {
  console.log("Current value", counter());
});

counter.set(1);
```

上面的代码会依次输出 `"Current value 0"` 和 `"Current value 1"`。如果你对 signal 库的工作原理感兴趣，可以查看其[实现代码](https://github.com/mgechev/revolt/blob/c989a107945d23595493453c2c53b95fb2cba922/lib/signal.ts)或 Ryan 的[博客文章](https://dev.to/ryansolid/building-a-reactive-library-from-scratch-1i0p)。

## 渲染

我们已经有了视图和 signal 库，剩下的就是渲染器了！让我们看一看 `render` 函数：

```typescript
export const render = (view: View, root: Element): Node | Node[] => {
  if (isConditional(view)) {
    return renderCondition(view, root);
  }
  if (isIterator(view)) {
    return renderIterator(view, root);
  }
  if (view instanceof Array) {
    return renderViewList(view, root);
  }
  if (typeof view === "string") {
    return renderTextNode(view, root);
  }
  if (typeof view === "function") {
    return renderDynamicText(view, root);
  }
  return renderElement(view, root);
};
```

非常直观，与解析器非常相似。现在让我们看一看 `renderIterator` 的实现，了解如何使用 signal：

```typescript
const renderIterator = (view: For<any>, root: Element) => {
  let collection;
  let result: Node | Node[] | undefined;
  effect(() => {
    collection = view.collection();
    if (result) {
      destroy(result);
    }
    result = render(collection.map(view.items), root);
  });
  return result ?? [];
};
```

就是这样！

在 `effect` 内部，我们读取代表集合的 signal，然后销毁上一个 signal 值对应的 DOM，再渲染新的集合。这里我们利用了同步 `effect` 实现的特性。

> 请记住，这是一个过度简化的实现。所有现代框架都会有 diff 逻辑，只重新渲染发生变化的项目以优化运行时性能。

类似地，我们也实现了其他 signal 绑定：

```typescript
const renderElement = (view: ElementConfig, root: Element) => {
  const element = document.createElement(view.name);
  for (const attribute in view.attributes) {
    const binding = view.attributes[attribute];
    if (!isDynamicBinding(binding)) {
      element.setAttribute(attribute, binding);
      continue;
    }
    effect(() => {
      const value = binding();
      if (value === false) {
        element.removeAttribute(attribute);
        return;
      }
      element.setAttribute(attribute, value);
    });
  }
  // ...
};
```

这里我们为 signal 类型的属性绑定创建了一个 `effect`。每次收到 signal 的新值时，我们就手动更新该属性。

你可以在 [GitHub](https://github.com/mgechev/revolt) 上查看完整实现。

## 其他方案

Angular 和 React 采用了截然不同的方案。虚拟 DOM 依靠裁剪组件树中未发生变化的部分来工作。它的优雅之处来自函数式编程，但也可能导致额外的渲染开销。

与 revolt 的方案类似，Angular 也将创建与更新分离，但方式有所不同。Angular 编译器会生成两条渲染代码路径：

- 一条用于组件的初始渲染
- 另一条仅包含视图的动态部分

Signal 会通知框架视图动态部分发生了变化，从而让 Angular 调度变更检测并进行更新。

## 结语

差不多就是这些了。Revolt 是一个小型库，允许探索 Web 框架中的不同概念，例如细粒度响应式、宿主元素、引用、服务端渲染等。

在这篇文章中，我们主要聚焦于渲染和细粒度响应式，但我很乐意深入探讨其他话题。欢迎告诉我你对哪些内容感兴趣！
