---
pubDatetime: 2026-05-30T14:29:54+08:00
title: "[译] 模板中继器的默认性能"
slug: performance-for-repeaters
featured: false
draft: true
isTranslation: true
tags:
  - angular
  - performance
  - rendering
description: "这是关于@for"
canonicalURL: https://riegler.fr/blog/2023-11-03-performance-for-repeaters
---

> 原文地址: https://riegler.fr/blog/2023-11-03-performance-for-repeaters

Angular v17 中引入的主要功能之一是 [new template syntax](https://blog.angular.io/meet-angulars-new-control-flow-a02c6eee7843)，称为“@-syntax”。

这种新语法的显着成果之一是引入了可延迟视图，这是一项强大的功能，允许开发人员从模板延迟加载组件。您可以在此 [blog post](https://riegler.fr/blog/2023-10-05-defer-part1) 中了解有关可延迟视图的更多信息。

除了可延迟视图之外，Angular 团队还引入了 `@for` 块，旨在取代 `ngFor` 指令。 `@for` 块提供了一种更加结构化和明确的方式来处理循环并迭代 Angular 模板中的集合。这种新方法增强了模板中控制流和声明性 HTML 之间的分离。

## 新的 `@for` 块

以下是 Angular 中新 `@for` 块的示例用法

```
<ul>
  @for (item of items; track item.id; let e = $even) {
    <li> Item #{{ $index }}: {{ item.name }}</li>
  }
</ul>
```

在这个例子中可以明显看出与传统结构指令的显着背离。由 `@for` 块表示的新语法在控制流和声明性 HTML 之间提供了明显的分离。

在 `@for` 块重复器的上下文中，您可以直接访问几个可用的隐式变量。此外，值得注意的是，您还可以为这些变量创建别名，这在处理嵌套的 `@for` 块时特别有用。

| 变量     | 意义                 |
| -------- | -------------------- |
| `$count` | 迭代集合中的项目数   |
| `$index` | 当前行的索引         |
| `$first` | 当前行是否为第一行   |
| `$last`  | 当前行是否为最后一行 |
| `$even`  | 当前行索引是否为偶数 |
| `$odd`   | 当前行索引是否为奇数 |

## 性能改进

During each change detection cycle in Angular, when a component contains a repeater (such as an `@for` block), Angular employs a comparison algorithm to identify differences between the previous and the current iterable set. This algorithm plays a crucial role in optimizing the rendering process by reducing the number of costly changes that would otherwise be applied to the DOM.

在 Angular 17 之前的版本中，这种比较算法在各种性能基准测试中被认为是一个显着的性能瓶颈。它有可能对 Angular 应用程序的效率产生负面影响，特别是在处理大型数据集或频繁更新时。

随着版本 17 中新语法的引入，Angular 团队借此机会重新审视并增强了这种比较算法。目标是使其更高效、更能响应可迭代数据的变化，最终提高 Angular 应用程序的整体性能。这种优化是 Angular 版本 17 中采用的“性能优先”方法的重要组成部分，确保在使用转发器时更改检测和渲染尽可能高效。

以下基准测试将 Angular 与其之前的版本以及现在与其他著名的高性能框架进行了比较。

| v16 `ngFor` - 与 - v17 `@for`                                                                 | Angular v17 与其他框架对比                                                                  |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [v16 vs v17 diffing performance comparison](/blog-images/performance-for-repeaters/16-17.png) | [Angular compared with other framworks](/blog-images/performance-for-repeaters/fw-comp.png) |

### 性能第一

Angular 中使用的比较算法依赖于 track 属性来在迭代数组中的项目与其对应的 DOM 元素之间建立连接。在以前的版本中，特别是使用 `ngFor` 指令时，设置 `trackBy` 函数既是可选的，又有些麻烦。默认情况下，该行为将 DOM 元素关联到项目的引用，这导致了重大的性能挑战，尤其是在使用不可变数据集时。对一个或多个对象的任何更改都会导致比较算法将该项目与 DOM 节点关联起来，从而需要删除和重新创建 DOM 元素。

使用版本 17.0 中的新 `@for` 块，为 `track` 选项选择了“性能优先”方法，因此，该属性现在在 `@for` 块中是强制的。这意味着开发人员现在负责明确指定算法应如何比较提供给 `@for` 块的数组中的对象。

在 @for 块中设置 track 属性时，开发人员有多个选项可供选择。跟踪选项的选择取决于数据的具体特征和应用程序的要求。让我们考虑一下 `@for(item of list) { ... }` 示例：

| 身份                                                                 | $索引                                                                         | 身份证                                             |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| `track: item`                                                        | `track: $index`                                                               | `track: item.id`                                   |
| - 是 ngFor `trackBy` 中的默认值 - 仅当您不使用不变性时才是不错的选择 | - 当有疑问时，这是一个很好的默认值 - 如果项目被排序/移动/替换，将会把事情搞砸 | - 最灵活/最可靠的 - 需要每个项目有一个唯一的标识符 |

身份跟踪器是 `ngFor` 中的默认设置，在使用不可变数据集时存在重大性能问题。由于引用在每次突变时都会发生变化，因此框架必须在每次更改时删除/创建 DOM 节点，这是一项成本高昂的操作。因此，应该避免这种情况，而选择更好的替代方案（除了像 `number`、`string` 等 JS 基元）。

一个好的默认设置可能是基于索引的跟踪。比较使用索引将每个项目与其 DOM 元素进行匹配。当项目在数组内未移动/重新组织时，它非常有效。

```
@Component({
  template: `
  <h3>Should change every second but doesn't as often</h3>
  @for(item of arr; track $index) {
    <div>id: {{item.id}}</div>
  }`,
})
export class AppComponent {
  arr = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
  constructor(vcr: ViewContainerRef) {
    setInterval(() => {
      this.arr = this.arr.sort((a, b) => 0.5 - Math.random()); // random shuffle
    }, 1000);
  }
}
```

此示例（也是 [avalable on stackblitz](https://stackblitz.com/edit/angular-for-track-index-sort?file=src%2Fmain.ts%3AL23)）演示了当 `index$` 错误地不更新某些节点而中断渲染时可能会出现什么问题。将 `$index` 替换为 `item` 或 `item.id` 可解决此处的问题。

因此，虽然它有效，但您会发现这不是完美的默认值。

也许最推荐的解决方案是跟踪唯一标识符。参考唯一的 ID 为项目跟踪带来了灵活性。无论对象发生什么（可变性或不变性）。不幸的是，这仅适用于具有唯一标识符的结构，如果数据结构在设计时没有考虑到它们，则可能需要进行一些重构。

因此，您会看到，没有完美的解决方案，开发人员需要了解所选轨道属性的含义。但可以肯定的是，通过采用“性能第一”的方法进行设计，我们可以在控制流中明确说明幕后将发生什么。

### 关于迁移示意图

当我们讨论新的 `@for` 块时，需要注意的是，有可用的迁移原理图（可通过 `ng generate @angular/core:control-flow` 访问）帮助从基于指令的控制流过渡到新的“@-syntax”控制流。这些迁移原理图内置支持在迁移过程中处理可选的 `trackBy` 属性。

以下是迁移过程的处理方式：

- **没有 `trackBy` 属性**：如果原始代码缺少 `trackBy` 属性，迁移原理图将自动将 track 属性设置为 item，这反映了以前 Angular 版本的行为。这简化了开发人员未显式定义 `trackBy` 函数的情况下的迁移过程。
- **存在 `trackBy` 属性**：当代码包含 `trackBy` 属性时，迁移工具将保留该函数并按指定调用它 (`track: myTrackByFn($index, item)`)。这确保了 `trackBy` 函数中定义的跟踪逻辑保留在新的 `@for` 块中，从而维持可迭代数据所需的跟踪行为。

创建这些迁移工具所付出的努力确实值得称赞。它们极大地帮助开发人员顺利过渡到新的 @-syntax 控制流程，同时保留现有的跟踪逻辑。这体现了 Angular 团队致力于增强开发人员体验和简化升级过程的承诺，他们在这一领域的工作值得高度赞扬！ 💯

## 提供反馈

新的控制流语法作为开发者预览版登陆 v17。这个稳定阶段使 Angular 核心团队能够收集有价值的反馈并完善新 API 的实现。

`track` 属性的要求可能会在某些开发人员之间产生一些摩擦，因为它代表了重大的行为变化。如果您对是否应该强制、可选或有后备选项有深刻的反馈或想法，可以使用 [open issue](https://github.com/angular/angular/issues/52050) 专门进行此讨论。欢迎您提出意见和建议，这将有助于此功能的持续改进。
