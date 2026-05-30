---
pubDatetime: 2026-05-29T20:07:42+08:00
title: "[译] 理解 effect"
slug: understanding-effects
featured: false
draft: true
isTranslation: true
tags:
  - angular
  - signals
  - effect
  - change-detection
description: 本文介绍 Angular v19 中 Root effect 与 View effect 的差异、调度时机，以及它们在渲染与测试中的实际影响。
canonicalURL: https://riegler.fr/blog/2024-10-15-effect-context
---

> 原文地址: https://riegler.fr/blog/2024-10-15-effect-context

![封面图](/blog-images/understanding-effects/vackground-com-ZNkiEWL02mI-unsplash.jpg)

# 理解 effect

**v19 中的 Root effect 与 View effect**

Matthieu Riegler - 2024 年 9 月 18 日

与其他 signal API 不同，`effect` 还没有稳定下来，目前仍处于 developer preview（开发者预览）阶段。这是有原因的：调度机制和响应式上下文仍需要根据开发者反馈做一些细致调整。

effect 是一种结构：当它读取的 signal 发生更新时，就会执行对应的响应式函数。它通过 `effect()` 函数来声明：

#### `effect` 定义

```
function effect(fn: (cleanupFn: CleanupFn) => void, options?: EffectOptions): EffectRef;

interface EffectOptions {
  injector?: Injector;
  forceRoot?: true;
  manualCleanup?: boolean;
}
```

## 与上下文相关的 effect

effect 可以分为两类：Root effect 和 View effect。创建出来的是哪一种，取决于调用 `effect()` 函数时所处的上下文。如果在组件内部调用，就会生成 View effect；否则就会生成 Root effect。

需要注意的是，Angular 会根据调用上下文自动为你决定创建哪种 effect。你不需要显式在 View effect 和 Root effect 之间做选择。也可以通过 `forceRoot` 标志覆盖这一行为，强制创建 Root effect。

## Root effect

Root effect 是应用中的顶层 effect，不属于任何组件层级，也独立于组件更新。例如，在根服务中创建的 effect 就是 Root effect。

它们适合用于以下操作：

- 将状态变化传播到其他 signal 上（当 `computed` 不适用时）。
- 将状态与后端或某些本地存储保持同步。
- 执行与组件无关的渲染（例如与其他框架集成）。
- 日志记录 / 调试。

Root effect 通过 macrotask 来调度：在每次 `ApplicationRef.tick` 时（并且存在 dirty 的 Root effect 时）执行。它们按 FIFO 顺序排队：先变 dirty 的 effect 会先执行。

dirty 的 Root effect 会一直运行到队列清空为止，这带来的一个特殊结果是：你有时会看到 effect 以一种近乎同步的方式运行。

```ts
sig = signal(0);

#myRootEffect = effect(() => {
  if (this.sig() < 5) {
    console.log(this.sig());
    this.sig.update(s => s + 1);
  }
});
```

这段示例代码会在执行任何变更检测之前先打印 5 次日志。

在单元测试中，你可以用 `TestBed.flushEffects()` 刷新 Root effect。

## View effect

View effect 位于组件层级之中，并作为变更检测周期的一部分执行。由于这个时机，View effect 可以用来响应 input signal 的变化，或更新子组件中使用的状态（包括创建和销毁子视图）。

之所以需要 View effect，主要是因为有两个重要使用场景 / 关注点是 Root effect 无法覆盖的：

1. Signal input。

Input signal 会在变更检测过程中被设置。这个时机对那些要监听它们的 effect 很重要。更关键的是，必填的 signal input 在收到第一个值之前是不能读取的。这意味着，在组件 inputs 完成设置之前，effect 不能被调度。

尤其关键的是，`input.required` signal 在收到初始值之前不允许被读取。这意味着，在组件 inputs 完成设置之前，effect 不能被调度。

2. 会影响组件状态或子组件状态的 effect。

在组件中创建 effect 的一个重要原因，是为了对 input 变化作出反应，并更新组件自身或子组件的状态：要么为组件或其子组件派生出新值，要么创建或销毁嵌入视图。例如，下面的 effect 实现了 `@if` 控制流的响应式版本：

#### `需要在 CD 之前运行的 effect`

```ts
const show = computed(() => !!cond());
let view;
effect(() => {
  if (show()) {
    view = this.vcr.createEmbeddedView(this.childView);
  } else {
    view.destroy();
  }
});
```

现在设想这个 effect 在变更检测之后才运行，会带来两个主要后果：

- 如果创建了一个子视图，它就不得不再调度一次新的变更检测周期，这会造成低效。
- 如果 `cond` 变成 `false`（因此 `show` 也会变成 `false`），那么这个嵌入视图会在被销毁之前先参与一次变更检测。这会破坏该 effect 试图维持的不变量，而且这个嵌入视图会在拿到它本不该处理的空值时执行变更检测。

换句话说，那些会影响子节点渲染的 effect，必须在这些子节点进入变更检测之前运行。否则既可能打破不变量、导致崩溃，也会带来性能低效。View effect 正是为此提供保证。因此，View effect 会在变更检测期间、每次组件检查开始时运行。

可以看[这个 stackblitz 示例](https://stackblitz.com/edit/angular-18-component-effect-timing?file=src%2Fmain.ts)，了解 v18 effect 时序下的这个问题。

### 调度

View effect 会与模板中的某个特定节点关联。比如下面这个模板：

```html
<div tooltipDirective>...</div>
<child-cmp childDirective />
```

`tooltipDirective` 的 effect 会在更新过程走到 `<div>` 节点时执行，而 `<child-cmp>` 和 `childDirective` 的 effect 会在更新过程走到 `<child-cmp>` 节点时执行。这与当前指令生命周期钩子和 host binding 所使用的机制相同。

View effect 应该在 host binding 之前运行，因为它们可能会更新 host binding 会读取的状态。这个时机与 `ngOnChanges` / `ngDoCheck` 类似。需要注意的是，这要求关联节点的父视图被刷新，才能触发该 effect。通常这本来就会发生（最常见的情况是，该 effect 正是由这个视图里的某个 input signal 触发的），但如果触发 effect 的 signal 与父视图毫无关系，这种方式就不是最优的。我们当然可以投入一些工作来消除这种低效，但它未必值得引入额外复杂度。

### `AfterRenderEffect`

既然 View effect 会在组件更新与变更检测之前触发，我们仍然需要一种在应用完全渲染后才触发的响应式原语。

`AfterRenderEffect` 就是为此而设计的，它会在特定阶段执行已注册的 effect。

- `earlyRead`
  - 在后续 `write` 回调执行之前，使用这个阶段从 DOM 中**读取**数据，例如执行浏览器原生并不支持的自定义布局。如果读取操作可以等到 write 阶段之后，优先使用 `read` 阶段。**绝不要**在这个阶段向 DOM 写入。
- `write`
  - 使用这个阶段向 DOM **写入**。**绝不要**在这个阶段从 DOM 读取。
- `mixedReadWrite`
  - 使用这个阶段同时读取和写入 DOM。只要有可能把工作拆分到其他阶段，就**绝不要**使用这个阶段。
- `read`
  - 使用这个阶段从 DOM **读取**。**绝不要**在这个阶段向 DOM 写入。

#### `afterViewEffect`

```ts
afterRenderEffect({
  earlyRead: () => ...,
  write: () => ...,
  mixedReadWrite: ...,
  read: () => ...,
});
```

## 错误处理与测试

由于这两种 effect 都是在变更检测过程中运行的，它们都会向变更检测的 `ErrorHandler` 上报错误。这意味着，如果 effect 内部发生错误，异常会在顶层被抛出，也就是在 `ApplicationRef.tick()` 上。

下面是一个在 effect 执行期间检查错误的例子。

```ts
it("should throw error...", () => {
  // 创建一个会抛出异常的 effect
  const appRef = TestBed.inject(ApplicationRef);
  effect(
    () => {
      throw new Error("fail!");
    },
    { injector: appRef.injector }
  );

  // 显式运行变更检测，并检查抛出的异常
  expect(() => appRef.tick()).toThrowError("fail!");
});
```

对于更复杂的错误处理场景，我们可以转而监听 `ErrorHandler` 本身。

由于 effect 执行期间发生的异常会冒泡到变更检测流程中，因此在测试里需要通过设置 `rethrowApplicationErrors: false,` 来关闭这一行为（否则 `tick()` 会直接抛错）。

下面是更新后的示例，其中异常通过 `ErrorHandler` 来检查。

```ts
it("should throw error...", () => {
  let lastError: any = null;
  class FakeErrorHandler extends ErrorHandler {
    override handleError(error: any): void {
      lastError = error;
    }
  }

  TestBed.configureTestingModule({
    providers: [
      { provide: ErrorHandler, useFactory: () => new FakeErrorHandler() },
    ],
    // 确保 tick() 不会抛出异常。
    rethrowApplicationErrors: false,
  });

  // 创建一个会抛出异常的 effect
  const appRef = TestBed.inject(ApplicationRef);
  effect(
    () => {
      throw new Error("fail!");
    },
    { injector: appRef.injector }
  );

  // 显式运行变更检测
  appRef.tick();
  // 检查上报的错误
  expect(lastError.message).toBe("fail!");
});
```

## 最后

正如 [Angular 博客中关于 `effect` 的文章](https://blog.angular.dev/latest-updates-to-effect-in-angular-f2d2648defcd) 所提到的，由于时序相关的改动，`effect` 仍会保持在 developer preview 阶段，以收集更多反馈。

如果你在这些变更中遇到问题，欢迎[提交 issue](https://github.com/angular/angular/issues/new)。
