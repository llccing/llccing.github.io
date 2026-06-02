---
pubDatetime: 2026-05-30T14:30:47+08:00
title: "[译] Angular 17.1 预览版中为所有人提供无区域变更检测"
slug: zoneless-preview
featured: false
draft: false
isTranslation: true
tags:
  - angular
  - zoneless
  - change-detection
description: "你准备好了吗？"
canonicalURL: https://riegler.fr/blog/2024-01-11-zoneless-preview
---

> 原文地址: https://riegler.fr/blog/2024-01-11-zoneless-preview

Zoneless 是指无需 `zone.js` 即可进行变更检测的框架功能。

尽管 zoneless 尚未在独立应用程序中获得官方支持，但许多开发人员已成功地将其与 [RxAngular](https://www.rx-angular.io/) 等库结合使用。

无区仅影响变更检测的调度。底层的变化检测机制是一个独特的主题，并且无论是否使用区域都保持一致。

## 无区域化的原因

开发人员考虑从应用程序堆栈中删除 zone.js 有多种动机。列举几个：

- `zone.js` 引入了大约 30kB 原始的非延迟可加载有效负载。
- `zone.js` 对调试功能有负面影响（使调用堆栈有点难以阅读）
- 本地 api 的猴子修补会对性能产生负面影响（由于 `setInterval`、`requestAnimationFrame`、`addEventListeners` 等，CD 可能会被频繁触发）
- 在您的应用程序中拥有区域需要您来处理它们。一些 API 回调在角度区域之外运行，所以您会这样做。
- 静态地，很难知道您当前位于哪个区域，因为这是运行时上下文。
- 原生 async/await 无法修补，因此 Angular 依赖于 babel `plugin-transform-async-to-generator` 插件。

## 无区域变更检测在 17.1 预览版中如何工作？

### 无区域变更检测调度程序

我之前已经讨论过 [previous article](/blog/2023-11-02-v17-change-detection) 中的更改检测。到目前为止，Angular 依赖 `zone.js` 和 `NgZone` 通过调用 `ApplicationRef.tick()` 来安排更改检测。

为了实现无区域，框架必须依赖一个新的调度程序来负责调用 `ApplicationRef.tick()`。
The new scheduler is defined by the `ChangeDetectionScheduler` interface with a `notify()` method that should be called to schedule CD.
我们谈论调度程序是因为对 `notify()` 的调用应该合并以防止框架运行无用的 CD 周期。

对于 v17.1，团队选择依赖基于 `setTimeout` 的调度程序，这实际上非常简单：

#### **`zoneless_scheduling_impl.ts`**

```
class ChangeDetectionSchedulerImpl implements ChangeDetectionScheduler {
  private appRef = inject(ApplicationRef);
  private taskService = inject(PendingTasks);
  private pendingRenderTaskId: number | null = null;

  notify(): void {
    if (this.pendingRenderTaskId !== null) return;

    this.pendingRenderTaskId = this.taskService.add();
    setTimeout(() => {
      try {
        if (!this.appRef.destroyed) {
          this.appRef.tick();
        }
      } finally {
        // If this is the last task, the service will synchronously emit a stable notification. If
        // there is a subscriber that then acts in a way that tries to notify the scheduler again,
        // we need to be able to respond to schedule a new change detection. Therefore, we should
        // clear the task ID before removing it from the pending tasks (or the tasks service should
        // not synchronously emit stable, similar to how Zone stableness only happens if it's still
        // stable after a microtask).
        const taskId = this.pendingRenderTaskId!;
        this.pendingRenderTaskId = null;
        this.taskService.remove(taskId);
      }
    });
  }
}
```

要安排更改检测，框架需要调用 `notify()` 方法。

### 有信号

设计时，信号的目标之一是能够放弃 `zone.js` 的要求，以便能够安排更改检测。

因此，信号是编写无区域应用程序的最简单方法：每次更新使用的信号时，
该框架将调用 `ChangeDetectionScheduler.notify()` 来安排变更检测周期。

没有什么可以为你做的。您更新一个或多个信号，您将获得一个 CD 周期。

很酷啊？！

### 无信号

虽然信号使 Zoneless 非常容易支持，但它们不是必需的，并且存在替代方案！
是的，您理解正确，即使您尚未迁移到信号，您现在也可以启用无区！

在框架的核心，一个名为 `markViewDirty` 的私有函数也会调用 `ChangeDetectionScheduler.notify()`。

#### **`mark_view_dirty.ts`**

```
export function markViewDirty(lView: LView): LView|null {
  lView[ENVIRONMENT].changeDetectionScheduler?.notify();
  ...
}
```

这个函数实际上是一个老函数，它已经在框架中存在很多年了，并且已经在一些情况下被调用。
其中 `AsyncPipe`（通过 `markForCheck()`）和模板事件监听器确实调用此函数。

这意味着之前打过补丁的 API（例如 `setTimeout`、`setInterval`、`requestAnimationFrame`、`fetch` 或已解决/已拒绝的 Promise）不会触发更改检测。

因此，如果您的应用程序恰好严重依赖 Observables/`AsyncPipe` 模式，您的应用程序可能还会支持无区更改检测。

## 启用无区域预览

无区域变更检测目前处于私人预览版：它依赖于一种私人方法，预计在该功能正式落地之前该方法将被重命名。预览旨在帮助团队收集有关该功能的反馈，以便改进它。

要启用无区变更检测，您需要满足以下两个条件：

- 将 `ɵprovideZonelessChangeDetection` 添加到您的提供商。
- 从 `angular.json` 配置文件中的 `polyfills` 条目中删除 `zone.js`。

#### **`main.ts`**

```
bootstrapApplication(AppComponent, {
  /* ɵprovideZonelessChangeDetection()
   * enables zoneless magic
   */
  providers: [ɵprovideZonelessChangeDetection()],
});
```

`ɵprovideZonelessChangeDetection` 从 `17.1.0-rc.0` 开始可用。

我不建议在生产应用程序上使用无区域更改检测（或者需要您自担风险，就像使用私有 API 一样）。

## 演示

享受一个小型的无区域演示应用程序，其中包含使用信号、异步管道和侦听器进行更改检测的示例。

[Here on stackblitz](https://stackblitz.com/edit/angular-zoneless-demo?file=package.json,src%2Fmain.ts)

## 笔记

正如前面提到的，这不是一个已发布的功能，有些部分仍然缺失。
CLI 目前不允许配置 babel 插件。此问题已跟踪 [on the CLI repo](https://github.com/angular/angular-cli/issues/22191)。

如果您决定测试此功能并遇到任何困难，请不要犹豫 [create a new issue](https://github.com/angular/angular/issues/new/choose) 并提供复制品（stackblitz 或 github 存储库）。
