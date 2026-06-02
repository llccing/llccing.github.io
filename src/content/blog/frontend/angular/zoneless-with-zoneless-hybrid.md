---
pubDatetime: 2026-05-30T14:31:29+08:00
title: "[译] v18 中的混合变更检测"
slug: zoneless-with-zoneless-hybrid
featured: false
draft: false
isTranslation: true
tags:
  - angular
  - zoneless
  - change-detection
description: "无区域有助于基于区域。"
canonicalURL: https://riegler.fr/blog/2024-04-17-zoneless-with-zoneless-hybrid
---

> 原文地址: https://riegler.fr/blog/2024-04-17-zoneless-with-zoneless-hybrid

你喜欢无区吗？好吧，这是相关的，但运行区域应用程序的每个人都会感兴趣！

您可能知道，Angular v18 将为无区域变更检测提供实验性支持。这里就不做过多介绍了，推荐你看一下[the article by my buddy @Enea](https://justangular.com/blog/a-new-era-for-angular-zoneless-change-detection)。

虽然 Zoneless 是一个非常有趣的话题，但 Zoneful 应用程序将从围绕官方 zoneless 支持的工作中受益匪浅。有关技术细节，您可以查看 [this PR](https://github.com/angular/angular/pull/55102)，它引入了更改检测的更改。我们将其称为混合模式。

## 区域内、区域外

直到 v17，基于区域的应用程序依赖 `Zone.js` 来安排更改检测。

基本上，更改检测是在调用修补的浏览器 API 时安排的（`setTimeout`、`setInterval`、`Promise.then`、`addEventListener` 等）。

这有一个警告，只有当您位于 Angular 区域时才会触发更改检测。这会对性能产生影响，导致我们编写分别使用 `ngZone.runOutSideAngular(() => ...)`/`ngZone.run(() => ...)` 跳入和跳出 Angular 区域的代码。
这意味着执行上下文很重要，而这是很难静态确保的。

我们看到开发人员遇到的常见问题之一是在 Angular 区域之外更新信号而不安排更改检测周期。

这不被认为是伟大的DX。更新信号实际上是在告诉框架，“嘿数据发生了变化，请刷新我的组件”。 Angular 不应该忽略区域之外发生的变化。

## 无区域调度

放弃用于 CD 调度的 `zone.js` 意味着必须实现新的调度程序。在 v18 中，它可以在名为 `provideExperimentalZonelessChangeDetection()` 提供程序函数的奇特函数后面使用。

它的工作基本上是在以下情况下安排 CD 周期：

- 更新信号（通过 `set()`/`update()`）
- 调用 `changeDetectorRef.markForCheck()`
- 订阅了 `AsyncPipe` 的 `Observable` 收到一个新值
- 连接/分离组件（通过 `detach()`/`attach`）
- 设置输入（`ComponentRef.setInput()`）

## 混合调度

在 v18 中，对于基于区域的应用程序，该框架将利用相同的调度程序以及现有的基于区域的调度程序：欢迎使用混合模式。

变更检测将像以前一样工作，但会带来 DX 改进。

想象一下您跳出角度区域的情况。

```
ngZone.runOutsideAngular(() => {
  setInterval(() => {
    someFunctionSomewhere();
  }, 1000);
})

function someFunctionSomewhere() {
  mySignal.set(newValue)
}
```

在此示例中，不会安排任何更改检测。 `setInterval`，由于上下文（在角度区域之外）不会触发 CD，并且信号本身不会调度任何 CD，它们只是将组件标记为脏。这使得这段代码有点脆弱。由于执行上下文，您不知道 `someFunctionSomewhere` 是否实际上会产生更新的视图。

在这里，混合模式将派上用场并消除执行上下文问题：信号更新将始终安排 CD 周期。
你要求更新，你就会得到更新，无论上下文如何。伟大的 DX 胜利不是吗？

总结一下这些变化，以下是安排变更检测的新情况：

- You're explicitly instructing the framework to update : `signal.set()`/`signal.update()`/ `changeDetectorRef.markForCheck()`
- 新值被传递到 `AsyncPipe`。它基于 `markForCheck`，现在也将始终安排 CD
- 附加/分离视图时

## 我是否会使用混合模式进行大量 CD 调度？

我看到你的问题来了！我告诉你，CD调度将发生在角度区域之外。这会影响表演吗？

是的，跑出角度区域是为了减少CD调度的次数。对于所有 `zone.js` 修补的 API，它将保持这种方式。 `setInterval`仍然不会安排CD，你不必担心这一点。

What will change is that, if ever you were telling the framework to update its state (via `signal.set` of `markForCheck()`); it will now schedule change detection because you explicitly told him to !

## v18 中默认使用混合模式

您如何从中受益？自 `18.0.0-next.5` 预发布以来，此功能默认启用。

如果您对此功能有疑问，仍然可以使用 [`provideZoneChangeDetection`](https://angular.dev/api/core/provideZoneChangeDetection) 提供商功能选择退出：

```
bootstrapApplication(App, {
  providers: [
    provideZoneChangeDetection({ ignoreChangesOutsideZone: true }),
  ],
});
```

➡️ 享受这个简短的混合调度 [stackblitz demo](https://stackblitz.com/edit/v18-hybrid-mode)。
