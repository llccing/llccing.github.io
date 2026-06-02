---
pubDatetime: 2026-05-30T16:45:00+08:00
title: "[译] 触发变更检测，但不要太频繁"
slug: cd-coalescing
featured: false
draft: false
isTranslation: true
tags:
  - angular
  - change-detection
  - microtasks
  - event-loop
description: 本文解释 Angular 中基于 zone 的变更检测为何会在微任务队列清空后触发，并说明为什么用微任务合并比多次 setTimeout() 更适合手动调度 CD 周期。
canonicalURL: https://riegler.fr/blog/2023-09-20-cd-coalescing
---

> 原文地址: https://riegler.fr/blog/2023-09-20-cd-coalescing

![Image](/blog-images/cd-coalescing/larry-costales-YFR_x3MqpHc-unsplash.jpg)

在 Angular 中，当涉及基于 zone 的变更检测时，我们有时需要手动触发它。写本文时，还没有可用于调度新一轮 ChangeDetection（CD）周期的 API（[待解决 issue](https://github.com/angular/angular/issues/43168)）。

## 前言

这篇文章会聊到 JavaScript 的内部机制，尤其是浏览器的事件循环。

如果你还不熟悉 _microtask_、_macrotask_ 或 _queues_ 这些术语，我推荐你先读一读 Jake Archibald 的那篇精彩文章：[任务、微任务、队列与调度](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)（[中文翻译版](/posts/tasks-microtasks-queues-and-schedules)）。

另外，为了便于说明，从这里开始我提到“入队任务”时，指的都是把函数回调加入微任务或宏任务队列。

## Angular 中变更检测是如何触发的

在 Angular 里，本质上只要调用 `ApplicationRef.tick()`，就会触发一次变更检测周期。每当微任务队列被清空时，这件事会自动发生。

#### **`ApplicationRef.ts`**

```ts
this._onMicrotaskEmptySubscription = this.zone.onMicrotaskEmpty.subscribe({
  next: () => {
    this.zone.run(() => {
      this.applicationRef.tick();
    });
  },
});
```

这里 `zone.js` 非常关键，因为原生 API 并没有能力让你检查微任务队列和宏任务队列的状态。

## 调度一次变更检测

### 用 `setTimeout()` 入队一个宏任务

如果你写过一些 Angular，八成已经在某个地方写过 `setTimeout()` 来修 bug。你也会很快发现，它之所以能解决很多问题，是因为它会触发新一轮 CD 周期。

![不算好，也不算太糟](/blog-images/cd-coalescing/not-great.jpg)

这只是个权宜之计，不算好，但也不算太糟。

它的工作方式如下：

1. 你调用 `setTimeout()`
2. 一个宏任务被加入队列
3. 宏任务队列中的回调被执行，微任务队列也会被执行并清空
4. `onMicrotaskEmpty` 这个 observable 发出通知
5. 调用 `ApplicationRef.tick()`

`setTimeout()` 会入队一个宏任务。由于宏任务是在把执行权交还给事件循环之前，一次只执行一个任务，因此你调用多少次 `setTimeout()`，就会有多少次 CD 周期。正如前面所说，这“不算好，也不算太糟”（但确实能修好 bug）。

### 入队一个微任务

比起调用 `setTimeout()` 以及它对应的宏任务，更好的做法是依赖微任务。最常见的两个 API 是 `Promise.resolve().then(() => ...)` 和 `queueMicroTasks(() => {})`。调用其中任意一个函数，本质上都会入队一个微任务。

与宏任务队列不同，微任务队列会把其中所有任务一个接一个全部执行完，包括那些在执行过程中又新加入的任务。

> ⚠️ 请注意，递归地反复入队会导致无限循环。

这意味着，在把执行权交还给事件循环之前，队列中的每个回调都会先执行完。换成 Angular 的语境来说，这意味着你只会得到一次 CD 周期。

这有助于你优化 CD 周期的触发方式：只调度一次 ChangeDetection 周期，不多也不少。

## 演示

下面这两个函数分别会入队 3 个宏任务和 3 个微任务。

```ts
fireMacrotasks() {
  setTimeout(() => {}, 100);
  setTimeout(() => {}, 100);
  setTimeout(() => {}, 100);
}

fireMicrotasks() {
  queueMicrotask(() => {});
  queueMicrotask(() => {});
  queueMicrotask(() => {});
}
```

第一个函数实际上会调度 3 次 CD 周期，而第二个只会调度一次。

➡️ [在 StackBlitz 中运行](https://stackblitz.com/edit/angular-tasks-coalescing?file=src%2Fmain.ts)

## 补充

即便是框架内部代码，也依赖微任务来调度 CD 周期。下面是 [forms 模块](https://github.com/angular/angular/blob/0ee0f780e4c19d43dde9bac0bb6468ea6431d24b/packages/forms/src/directives/ng_model.ts#L30-L47) 的一段摘录。

#### **`ng_model.ts`**

````ts
/**
 * 当 `ngModel` 的输入发生变化时，它会强制额外执行一次变更检测：
 * 例如：
 * ```
 * <div>{{myModel.valid}}</div>
 * <input [(ngModel)]="myValue" #myModel="ngModel">
 * ```
 * 也就是说，`ngModel` 可以把自身导出到该元素上，然后在模板中使用。
 * 正常情况下，这会导致位于 `input` 之前、使用该导出指令的表达式
 * 仍然拿到旧值，因为它们之前已经做过脏检查。
 * 由于这在 `ngModel` 中是一个非常常见的场景，我们加入了第二轮
 * 变更检测。
 *
 * 说明：
 * - 无论有多少个 `ngModel` 发生变化，都只会额外执行一次。
 * - 使用带 `exportAs` 的指令时，这其实是一个通用问题！
 */
const resolvedPromise = (() => Promise.resolve())();

...
class NgModel {
  private _updateValue(value: any): void {
    resolvedPromise.then(() => {
      this.control.setValue(value, {emitViewToModelChange: false});
      this._changeDetectorRef?.markForCheck();
    });
  }
}
````
