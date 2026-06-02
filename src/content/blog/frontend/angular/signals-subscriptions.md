---
pubDatetime: 2026-05-30T14:27:54+08:00
title: "[译] 信号和订阅"
slug: signals-subscriptions
featured: false
draft: false
isTranslation: true
tags:
  - angular
  - signals
description: "我需要取消订阅吗？"
canonicalURL: https://riegler.fr/blog/2023-10-24-signals-subscriptions
---

> 原文地址: https://riegler.fr/blog/2023-10-24-signals-subscriptions

距离 v17 发布还有几天，我们来讨论一下 Signals 吧！

## 我们来谈谈信号

首先，让我们探讨一下信号的概念。为了简洁的介绍，我将引用 [official docs](https://angular.io/guide/signals)：

> Angular Signals 是一个系统，可以精细地跟踪整个应用程序中状态的使用方式和位置，从而允许框架优化渲染更新。

为了实现这种跟踪，信号实现了生产者/消费者模式。其中每个 `Signal` 充当生产者，调用它们的模板充当消费者。

```
function signal<T>(initialValue: T) {
  const reactiveNode = {
    producerNodes: [],
    consumerNodes: [],
    value: initialValue;
  }
  const getter = (() => {
                   producerAccessed(reactiveNode);
                   return reactiveNode.value;
                 });
  (getter as any)[SIGNAL] = reactiveNode;
  return getter;
}
```

本质上，`Signal` 是一个可调用对象，有两个主要用途：

- 通知反应树正在读取信号
- 返回它的值

常规信号和计算信号以及模板都被视为 ReactiveNode。 ReactiveNode 是一个维护消费者列表并了解其生产者的对象。

当在响应式上下文（例如模板执行）中调用信号时，`producerAccessed()` 函数将消费者（模板）注册到生产者（信号），并且消费者保留对其生产者的引用。

```
flowchart LR

A["mySignal = signal(42)\n consumers: [A,B,C]"]
A --- B("MyCompA_Template\n {{ mySignal() }}\n producers:[mySignal]")
A --- C("MyCompB_Template\n {{ mySignal() }}\n producers:[mySignal]")
A --- D("MyCompC_Template\n {{ mySignal() }}\n producers:[mySignal]")
```

从某种意义上说，模板在调用信号时会订阅信号。因此，当信号更新时，它可以通知每个消费者并将它们标记为“脏”。当消费者是模板时，这个过程相当于调用`changeDectectorRef.markForCheck`。这可确保您的模板将在下一个 CD（更改检测）周期中接受更改检测。

现在，当模板被销毁时会发生什么？您需要手动订阅信号吗？

当然不是！ Angular 框架为我们处理信号注销。就像 `AsyncPipe` 自动订阅和取消订阅 `Observable` 一样，它管理信号的订阅和取消订阅！

当组件被销毁或模板的一部分被删除时（例如，当 `ngIf` 或 `@if` 条件变为 false 时），将调用 `consumerDestroy` 函数。消费者维护对其生产者的引用，通知他们从消费者列表中删除。

就这么简单，我们可以无缝订阅/取消订阅信号！

### `computed` 信号怎么样？

`computed()` 函数允许我们编写信号。该函数的回调也是一个反应式上下文。这意味着两件事：

- 计算出的信号是在其回调中调用的 1+ 个信号的使用者
- 这个计算信号是任何调用它的消费者的生产者

在不涉及太多细节的情况下，该框架区分了实时消费者和非实时消费者。

`effect()` 或模板始终是实时消费者：在任何情况下他们都不希望从生产者处获得更新。
与计算信号相反，计算信号只有被另一个实时消费者消费时才是实时的。

非实时计算信号不会对生产者更新做出反应，也不会将其消费者标记为脏。

节点之间的生产者-消费者关系构建了一个由活跃消费者驱动的真实依赖图。如果图的一端至少有一个活跃的子消费者，节点将计算它们的值。如果不是，则可以节省计算时间。

```
flowchart TB

A(Signal)
A2(Signal)
A3(Signal)
A4("Signal\nlive")
classDef live fill:#adebad
classDef nonlive fill:#ffb3b3

A:::live ---> B(Computed)
A ---> C("Computed\nlive")
A2:::live ---> E(Computed)
A3:::live ---> D
A4:::nonlive ---> J
A:::live ---> D(Computed)
B:::live ---> E
B ---> J("Computed \n live")
B ---> F(Computed)
D:::live ---> F
D ---> F
E:::live ---> G{{Template}}
F:::live ---> H[/Effect\]
B -----> I{{Template}}

G:::live
H:::live
I:::live

C:::nonlive
J:::nonlive
```

这就是反应图的样子，其中包含实时和非实时信号，具体取决于叶子消费者！

### 从这里继续前进

您会看到，通过信号，我们可以实现基于推送的变更检测。当信号更新时，会发生变化检测。

尽管 CD 调度目前仍需要 `zone.js`，但这是迈向“无区域”的重要一步。信号更新时，模板被标记为脏，但不会立即检测到更改。出于性能原因，在每次信号更新时调用 `detectChanges` 并不是一个可行的解决方案（想象 10 个更新信号触发 10 个 CD 周期）。

虽然这个主题几乎还在开发中，但一些令人兴奋的变化已经在进行中！

例如，[this PR](https://github.com/angular/angular/pull/52302) 引入了一种新的部分更改检测方法。它没有为 CD 标记每个父组件（如 `markForCheck` 所做的那样，递归调用直至根组件），而是仅注册请求 CD 的组件并跳过父组件。这就是 `markAncestorsForTraversal` 所完成的任务。

## 我们来谈谈可观察到的

使用信号时，您经常会与 `Observables` 交互。这两个域之间的互操作性是通过 `toSignal` 等方法将 `Observable` 转换为 `Signal` 提供的。

正如您所知，从 `Observable` 读取值的唯一方法是将 `subscribe()` 写入它。

这正是 toSignal 所做的，如基本实现中所示：

```
export function toSignal<T>(source: Observable<T>, option: {initialValue: T}): Signal<T> {
  const state = signal<T>(options);

  source.subscribe({
    next: value => state.set(value),
  });
```

但是 observable 如何取消订阅呢？

在 [previous article](blog/2023-09-30-lazy-loading-mockable) 中，我讨论了 v16 中引入的一项功能：[`DestroyRef`](https://angular.io/api/core/DestroyRef)。 `DestroyRef` 允许您设置清理或销毁行为的回调。使用 `DestroyRef.onDestroy()` 注册的回调在调用它的注入器被销毁时执行。

框架再次为我们处理取消订阅操作，如更新的实现所示：

```
export function toSignal<T>(source: Observable<T>, option: {initialValue: T}): Signal<T> {
  const state = signal<T>(options);

  const sub = source.subscribe({
    next: value => state.set(value),
  });

  cleanupRef?.onDestroy(() => sub.unsubscribe());
```

反应效应依靠相同的机制来通知其生产者其销毁情况。 `DestroyRef.onDestroy` 触发 `effect()` 后面的观察者的 `destroy()` 方法。

但需要注意的是，与 `takeUntilDestroy` 类似，`DestroyRef.onDestroy()` 仅在注入器被销毁时才会被调用。当你在组件中调用`toSignal()`时，注入器就是`NodeInjector`，它会与组件一起被销毁。但是，如果在具有 `providedIn: 'root'` 的服务中调用 `toSignal()`，则注入器是根注入器，它几乎永远不会被破坏。所以，要警惕这种行为。

### 参考

- [`producerAccessed()`](https://github.com/angular/angular/blob/d82d58621ecc3ec4dfc40bccdb9daa7e646788e2/packages/core/primitives/signals/src/graph.ts#L185C40-L185C40)
- [`consumerDestroy()`](https://github.com/angular/angular/blob/d82d58621ecc3ec4dfc40bccdb9daa7e646788e2/packages/core/primitives/signals/src/graph.ts#L372)
- [`markAncestorsForTraversal()`](https://github.com/angular/angular/blob/d82d58621ecc3ec4dfc40bccdb9daa7e646788e2/packages/core/src/render3/util/view_utils.ts#L222C27-L222C27)
- [`toSignal()`](https://github.com/angular/angular/blob/d82d58621ecc3ec4dfc40bccdb9daa7e646788e2/packages/core/rxjs-interop/src/to_signal.ts#L96)

如果您对信号背后的实现感兴趣的话，还有关于信号的主题。我真的推荐 [live coding session of Rainer Hahnekamp](https://www.youtube.com/watch?v=6wWteAza_FY)，他在其中重新实现了信号，这有助于理解它们是如何工作的。我将值得你花时间！
