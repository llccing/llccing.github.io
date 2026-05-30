---
pubDatetime: 2026-05-30T14:20:02+08:00
title: "[译] 查找、调试并修复 Angular 中的内存泄漏"
slug: angular-memory-leak
featured: false
draft: true
isTranslation: true
tags:
  - angular
  - animations
  - performance
description: "了解可帮助您调查内存泄漏的工具。"
canonicalURL: https://riegler.fr/blog/2023-07-20-angular-memory-leak
---

> 原文地址: https://riegler.fr/blog/2023-07-20-angular-memory-leak

今天，我想向大家介绍一个几年前就已经报道过的问题。用户在使用动画模块时担心内存泄漏。让我们重新审视导致解决此问题的调查！

## 确认是否存在内存泄漏

我们可以将范围缩小到 `:leave` 动画的使用。
请参阅此处的最小复制品：

```
@Component({
  selector: '[element]',
  template: 'This element is animated',
  standalone: true,
  animations: [trigger(`fade`, [transition(`:leave`, [])])],
  host: { '[@fade]': '' },
})
export class ElementComponent {}

@Component({
  selector: 'my-app',
  standalone: true,
  imports: [NgIf, ElementComponent],
  template: `
    <button (click)="visible = !visible">Toggle</button>
    <div *ngIf="visible" element></div>
  `,
})
export class AppComponent {
  visible = true;
}
```

每次移除组件时，使用切换按钮都会触发 `leave` 动画。

这可以通过 Chromium/Chrome/Edge DevTools 性能监视器的 DOM 节点计数器进行检测。

![DOM Nodes in the Performance Monitor](/blog-images/angular-memory-leak/dom-nodes.png "DOM Nodes in the Performance Monitor")

在此图中，您可以看到 2 个特定行为。

1. 引导后，DOM 节点数有所下降。这就是垃圾收集器 (GC) 的工作：清理未引用的 DOM 节点。
2. 接下来，我使用切换按钮缓慢但稳定地增加了 DOM 节点的数量。

为了确保这不是 GC 滞后的情况，我从 DevTools 手动触发了它。

![Trigger the GC manually](/blog-images/angular-memory-leak/performance-gc.png "Trigger the GC manually")

## 寻找泄漏源头

既然我们知道出现了问题，那么我们可以从哪里开始寻找罪魁祸首呢？

Edge Chromium（是的，在撰写本文时，只有 Edge 提供此功能），在 DevTools 中有一个特殊工具：Detached Elements。

您可以将其挂接到控制台旁边的底部面板中，以调查已从 DOM 分离的 Dom 节点。这些分离的节点仍然在内存中，因为它们仍然在代码中的某处被引用。这是内存泄漏的一个很好的提示。

在我们的例子中，它看起来像这样：

![The Detached Nodes tool](/blog-images/angular-memory-leak/detached-nodes.png "The Detached Nodes tool")

屏幕截图底部的列表代表仍在内存中的每个分离节点。
单击节点 ID 时，我们会获取引用该对象的堆栈跟踪。

这里的堆栈跟踪非常明确，我们的节点舒适地位于 `TransitionAnimationEngine` 类中名为 `_statesByElement` 的 Map 中。

这些调试信息也可以在 Chrome DevTools 中访问，但不太直接。拍摄应用程序的内存堆快照，过滤以搜索“detached”，您将在快照中找到类似的 detacted 元素列表。

![Detached Element in Chrome DevTools](/blog-images/angular-memory-leak/chrome-detached.png "Detached Element in Chrome DevTools")

> 📝 注意：
> 要调查 Angular 的代码源，您可以在 `angular.json` 设置中启用框架源映射，如下所示：
>
> ```
> “源地图”：{
> “脚本”：真实，
> “供应商”：真实
> },
> ```

```

Without entering too much in the detail of the fix provided in [this PR](https://github.com/angular/angular/pull/50929/files), the solution to our memory leak was to empty the Map at the end of the animation (which wasn't done under certain circumstances).

Without the node being referenced in this Map, the GC can trash it as expected and we no longer have out memory leak !

Et voilà !

I hope have learned something new today, see next time !

Matt.
```
