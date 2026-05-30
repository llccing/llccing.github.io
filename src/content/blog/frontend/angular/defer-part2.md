---
pubDatetime: 2026-05-30T14:25:40+08:00
title: "[译] 了解 Angular 的可延迟视图 - 第 1 部分。 2"
slug: defer-part2
featured: false
draft: true
isTranslation: true
tags:
  - angular
  - lazy-loading
  - performance
description: "里面的魔法"
canonicalURL: https://riegler.fr/blog/2023-10-08-defer-part2
---

> 原文地址: https://riegler.fr/blog/2023-10-08-defer-part2

我在 [previous article](/blog/2023-10-05-defer-part1) 中向您介绍了 Angular 中可延迟视图的基础知识。现在您知道可以用它们做什么，让我们在技术细节中提取它们的性能！

## 他们如何工作

在底层，可延迟视图是 Angular 编译器的一个功能。

编译模板时，Angular 编译器将 `@defer` 块中使用的所有依赖项提取到一个单独的函数中，并生成许多动态导入来加载相应的 JS 块。

| 模板 | 编译 |
| ---- | ---- |

| ``@推迟 {
<我的重组件/>
}` | ```
function defer_for_block {
return [ () => import('./my-heavy-component') ]
}

`````|

基本上，这个 `@defer` 块会产生一个动态导入，该导入将在触发器触发时执行。

## 嵌套块

当 `@defer` 块中有多个依赖项时，它们最终会出现在同一导入函数中（位于嵌套 `@defer` 块内部的依赖项除外）。

|模板|编译|
| ---| ---|
| ````
@defer { // 块 A
@if（选项==='a'）{
<重成分-a />
} @else if (选项 === 'b') {
<重成分-b />
} @别的 {
@defer { // 块 B
<重组件-c />
    }
  }
}
``` | ```
function defer_for_blockA {
  return [
    () => import('./heavy-component-a'),
    () => import('./heavy-component-b')
  ]
}

function defer_for_blockB {
  return [
    () => import('./heavy-component-c')
  ]
}
``` |

在这种情况下，我们有 2 个 `@defer` 块，从而产生 2 个生成的延迟加载函数。

当块 BlockA 的触发器被触发时，两个块都会被加载，但只会渲染其中一个组件。只有当我们将第三个块放入最后一个 `@else` 块时，才会加载第三个块。

因此，如果所有组件都很“重”，您可能需要考虑将这些组件包装到单独的 `@defer` 块中（类似于我们在最后一个 `@else` 块中的内容）。如果我们用 `@switch` 块替换 `@if` 块，则适用相同的逻辑。

## 先 `@for` 还是先 `@defer` ？

现在我们知道嵌套有影响，让我们比较一下将 `@for` 块与 `@defer` 块结合使用时的差异。

首先，我们需要了解 `@defer` 块的运行时影响。
在运行时，`@defer` 块的内容由嵌入视图表示（就好像内容位于 `<ng-template>` 中一样）。接下来看看两种可能的组合：

| `@for` 内的 `@defer` | `@for` 位于 `@defer` 内 |
| ---| ---|
| ````
@for（项目中的项目）{
@推迟 {
<我的重组件/>
  }
}
``` | ```
@defer {
  @for (item of items) {
    <my-heavy-component />
  }
}
``` |

在左侧示例中，对于每个项目，将创建一个作为 `@for` 循环的一部分创建的嵌入视图，以及为每个 `@defer` 块创建的嵌套嵌入视图。嵌入视图的数量将为 `items.length * 2`，延迟块实例的数量将为 `items.length`。

正确的示例将生成 `items.length + 1` 嵌入视图和单个延迟块实例。

| `@for` 内的 `@defer` | `@for` 位于 `@defer` 内 |
| ---| ---|
| - `items.length * 2` 嵌入视图 - `items.length` 延迟块实例 | - `items.length` 嵌入视图 - 单个延迟块实例 |

因此，对于上述情况，`@for` 循环的内容不具有不同“重”组件的条件，因此选择 `@defer` 位于 `@for` 循环之外的正确示例是有意义的。

但是，如果 `@for` 循环的内容具有一些额外的逻辑，并且涉及根据特定条件显示不同的“重”组件，则您可能需要选择左侧示例（其中 `@defer` 位于 `@for` 循环内部）来包装特定组件或一组组件。

现在您已经了解了用法的含义：

![test](/blog-images/defer-part2/81t40e.jpg)

如果您对这个出色的新功能还有任何其他疑问，请随时通过 [Twitter](https://twitter.com/Jean__Meche) 与我联系！
`````
