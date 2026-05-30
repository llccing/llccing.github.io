---
pubDatetime: 2026-05-30T14:28:37+08:00
title: "[译] Angular v17 中变更检测的状态"
slug: v17-change-detection
featured: false
draft: true
isTranslation: true
tags:
  - angular
  - change-detection
description: "全球本地化：全球化为本地化"
canonicalURL: https://riegler.fr/blog/2023-11-02-v17-change-detection
---

> 原文地址: https://riegler.fr/blog/2023-11-02-v17-change-detection

Angular v16 引入了 `Signal`，这是一个全新的 API，旨在在 Angular 应用程序中引入细粒度的反应性。

在 v17 中，信号 API 已提升为稳定版（`effect()` 除外），因此让我们看看最新版本中的更改检测情况。

## 现有的变更检测机制

自诞生以来，Angular 就依赖 `zone.js` 和 `NgZone` 通过调用 `ApplicationRef.tick()` 来安排更改检测。
该函数负责在根组件处启动变更检测。

从根组件开始，更改检测过程检查组件树中的每个组件。它检查标记为“脏”的组件以及使用默认更改检测策略的组件。这种全面的方法可确保根据需要检测更改并在整个组件层次结构中传播更改，从而维护应用程序数据流和用户界面的完整性。

这种变化检测方法是全局性的。该算法遍历（几乎）树的每个分支。

```
flowchart TD
  Def[ChangeDetectionStragery.Default] ~~~ A
  OnPush{{ChangeDetectionStragery.OnPush}} ~~~ A
  classDef cd fill:#adebad

  A[Appcomponent]

  A:::cd --> B[SideBarComponent]
  A --> C{{"MainViewComponent\n(dirty)"}}

  B:::cd --> F[HeaderComponent]
  B --> G[MenuList]
  G --> G1[MenuListItem]
  G --> G2[MenuListItem]
  G --> G3[MenuListItem]

  F:::cd
  G:::cd
  G1:::cd
  G2:::cd
  G3:::cd

  C -.-> C1{{"SomeViewComponent"}}
  C --> C2{{"SomeOtherViewComponent\n (dirty)"}}

  C2 -.-> C22{{"SomeDetail"}}

  C:::cd
  C2:::cd
```

在此图中，正在检查所有绿色组件（也由普通箭头指向）是否有更改。 `SomeViewComponent` 或 `SomeDetail` 不是，因为它们使用 `OnPush` 策略并且没有标记为脏。

通过在给定组件上调用 `changeDetectorRef.markForCheck()`，组件被递归标记为脏组件，直到根组件。这就是 `AsyncPipe` 所做的事情。在我们的示例中，`SomeOtherViewComponent` 将自身及其父级标记为脏。

要更深入地了解所有更改检测详细信息，您可以查看 [this article by Antonio Pekeljević](https://medium.com/@antoniopk/angular-change-detection-explained-169aea595423)。

## v17 引入本地更改检测

信号的引入使得本地变化检测成为可能。在 v16 中，实时信号（在模板中调用的信号）在通过 `Signal.set()`、`Signal.mutate()` 或 `computed()` 信号更新时确实将组件标记为脏。通过调用内部 [`markViewDirty()`](https://github.com/angular/angular/blob/e092184a5c3d98f4be329e4037c9039c1b420d75/packages/core/src/render3/reactive_lview_consumer.ts#L62) 函数将组件标记为脏。这与 `changeDetectionRef.markForCheck` 调用的函数相同。

在 v17 中，该函数调用已被 [`markAncestorsForTraversal()`](https://github.com/angular/angular/blob/83a3b85c355f6cb9f9b698bd90c2920341466032/packages/core/src/render3/reactive_lview_consumer.ts#L49) 取代。

这两个函数之间的主要区别在于，`markViewDirty` 以递归方式将其“脏”标记扩展到所有祖先组件，而 `markAncestorsForTraversal`` 将“脏”标记限制到当前组件，并安排其祖先以供将来遍历，而无需立即进行更改检测。

因此，虽然仍然依赖基于树的变更检测，但我们现在可以访问“glocal”（全局+本地）变更检测：

- 它仍然从根组件开始（因此是全局的）
- 具有默认策略的组件仍将被检查
- 仅当脏时，OnPush 组件仍会被检查
- 但我们现在可以将单个组件标记为脏（因此是本地）

如果您严重依赖使用 `OnPush` 策略，则这种全局方法将极大地减少更改检测所检查的组件数量。

从 17.0 开始，此本地更改检测仅在使用 `Signals` 时可用。 `markAncestorsForTraversal` 是私有 API。

```
flowchart TD
  Def[ChangeDetectionStragery.Default] ~~~ A
  OnPush{{ChangeDetectionStragery.OnPush}} ~~~ A
  classDef cd fill:#adebad

  A[Appcomponent]

  A:::cd --> B[SideBarComponent]
  A --> C{{"MainViewComponent\n(traversed)"}}

  B:::cd --> F[HeaderComponent]
  B --> G[MenuList]
  G --> G1[MenuListItem]
  G --> G2[MenuListItem]
  G --> G3[MenuListItem]

  F:::cd
  G:::cd
  G1:::cd
  G2:::cd
  G3:::cd

  C -.-> C1{{"SomeViewComponent"}}
  C --> C2{{"SomeOtherViewComponent\n(traversed)"}}

  C2 --> C22{{"SomeDetail\n dirty"}}

  C22:::cd
```

这个更新的示例显示了全球本地化/混合变化检测系统。默认策略组件上的更改检测保持不变，并且信号允许 OnPush 组件上的新本地更改检测。

## 变更检测演示

几年前（v8 时代）[Daniel Wiehl](https://github.com/danielwiehl/edu-angular-change-detection) 编写了一个很棒的现场演示，展示了 Angular 中变更检测的各个方面。该演示涵盖了变更检测何时发生、过程中到底发生了什么以及发生在哪里。

随着 Angular 的发展以及信号驱动的本地变化检测等新功能的引入，我们现在可以拥有一个更新的演示，其中包含了这些最新的变化和增强功能。

![Awesome demo](/blog-images/v17-change-detection/demo.png)

您可以在这里使用它：🚦[Awesome demo](https://jeanmeche.github.io/angular-change-detection/)🚦。

## 关于未来

如前所述，`NgZone` 仍然是自动更改方向的调度程序：`zone.js` 修补的 API 正在对微任务进行排队，一旦微任务队列为空，`NgZone` 就会调用 `tick()`。

为了实现真正的本地变化检测，有必要设计和实现一个新的调度程序。这个新的调度程序可以为官方对无区应用程序的支持铺平道路，这也是人们所期待的。

同时，我建议探索 [RxAngular](https://www.rx-angular.io/) 库，它提供了用于使用无区域应用程序的工具和解决方案。对于希望了解 Angular 应用程序中复杂的变更检测和性能优化的开发人员来说，该库可以成为宝贵的资源。
