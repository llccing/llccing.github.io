---
pubDatetime: 2026-05-26T05:00:00.000Z
title: "[译] 无生命周期钩子的 Angular —— 使用现代 API 构建组件"
slug: angular-lifecycle-hook-free
featured: false
draft: false
isTranslation: true
tags:
  - Angular
  - 前端
description: 探索如何使用 Angular 最新的信号（Signals）、DestroyRef、afterRender 等现代 API 替代传统的生命周期钩子，编写更简洁、可维护的组件。
canonicalURL: https://riegler.fr/blog/2024-12-31-lifecycle-hook-less
---

> 原文地址: https://riegler.fr/blog/2024-12-31-lifecycle-hook-less

![Lifecycle-Hook-Free Angular](/blog-images/angular-lifecycle-hook-free/cemrecan-yurtman-hmwvM0BuFOE-unsplash.jpg)

# 无生命周期钩子的 Angular

**使用现代 API 构建组件**

Matthieu Riegler - 2024 年 12 月 31 日

Angular 在最近的 2-4 个版本中以极快的速度引入了新的非破坏性特性。虽然这些特性不会破坏现有组件的工作方式，但它们将重塑我们未来编写组件的方式。

本文将讨论的其中一类 API，就是组件/指令的生命周期钩子。

## 生命周期钩子

组件的生命周期是指从组件创建到销毁之间发生的一系列步骤。每个步骤代表 Angular 渲染组件并随时间检查更新过程中的不同部分。

Angular 组件和指令共有 8 个不同的生命周期钩子：

1. `ngOnInit()`
2. `ngOnDestroy()`
3. `ngOnChanges(changes: SimpleChanges)`
4. `ngAfterContentInit()`
5. `ngAfterContentChecked()`
6. `ngAfterViewInit()`
7. `ngAfterViewChecked()`
8. `ngDoCheck()`

我们将逐一介绍它们，了解它们目前的用途以及新的替代方案。

## `ngOnInit`

`ngOnInit` 在组件初始化后调用一次。它主要用于初始化组件数据或获取初始资源。

开发者经常使用这个钩子来读取输入（inputs），因为只有在初始化之后，我们才能确保输入已经被设置。

#### `ngOnInit` 示例

```typescript
@Component({
  /* ... */
})
class UserComponent {
  @Input() name: string;
  lastname = input.required<string>();

  constructor() {
    // 输入尚未设置
  }

  ngOnInit(): void {
    // 可以读取输入
  }
}
```

直到 [v17](https://v17.angular.io/guide/lifecycle-hooks#initializing-a-component-or-directive)，官方的建议都是：

> 组件应该是易于构造且安全的。例如，你不应该在组件构造函数中获取数据。[……] `ngOnInit()` 是组件获取初始数据的好地方。

这背后的主要论点是，在触发该钩子之前，输入还不可用。

随着信号（Signals）的引入，新的可能性出现了。现在可以安全地访问输入。

其中一种方式是声明状态派生，例如使用 `computed`：

```typescript
computed(() => this.myInput());
```

计算信号（Computed signals）和任何其他派生（`linkedSignal`、`resource`）一样，都是惰性求值的。当你声明这样一个派生并在模板中使用时，Angular 会确保输入在被读取之前已经被设置。

另一个常见的信号消费者是 `effect`。正如我在[这篇文章](https://riegler.fr/blog/2024-10-15-effect-context/)中解释的，在组件中声明的 effect 会在组件初始化后以及每次信号变化时（但在组件同步之前）被调度执行。

总结一下，以下是一个使用信号替代 `ngOnInit` 的详尽示例，它依赖于状态派生和 `effect`。

#### 使用信号

```typescript
@Component({ template: `fullName()` })
class UserComponent {
  name = input.required<string>();
  lastname = input.required<string>();

  // 同步和异步派生，读取一些必需的输入。
  fullName = computed(() => `${this.name()} ${this.lastName()}`);
  localState = linkedSignal(() => this.name());
  resource = resource({
    request: () => ({ id: this.userId() }),
    loader: request =>
      this.httpClient(`https://myendpoint.com/user/${this.id}`),
  });

  constructor() {
    effect(() => {
      // 这是一个视图 effect
      // 它在初始化后首次执行
      this.name();
    });
  }
}
```

作为之前介绍内容的扩展，基于 `effect` 构建的函数将享有同样的优势。

一个很好的例子是 `toObservable` 函数，它依赖于 `effect`。

```typescript
@Component({
  /** ... */
})
export class FooComponent {
  readonly lang = input.required<string>();

  constructor() {
    // 这样做是没问题的
    toObservable(this.lang).subscribe(/** */);
  }
}
```

在这个例子中，`input` 只会被底层的 `effect` 求值，并在组件初始化之后才被读取。

## `ngOnChanges`

`ngOnChanges` 主要用于在同步过程（以前称为变更检测）中，当一个或多个输入发生变化时收到通知。

监听变化是基于信号的响应式编程的核心。通过状态派生构建你的状态，你就已经为此做好了准备。对于所有其他无法使用派生的情况，`effect` 就是你用来监听信号变化的工具。

### Effect 调度

关于 `effect` 的调度，有一点精确的补充。根据你希望回调何时运行，你会使用 `effect` 或 `afterRenderEffect`。

前者在组件被检查之前运行，后者在整个应用（每个组件）渲染完成之后运行。

```typescript
@Component( ... )
export class FooComponent {
  name = input.required<string>();

  constructor() {
    effect(() => { ... })
  }
}
```

`effect` 在组件同步之前运行。

```typescript
@Component( ... )
export class FooComponent {
  name = input.required<string>();

  constructor() {
    afterRenderEffect(() => { ... })
  }
}
```

`afterRenderEffect` 在应用完全同步之后运行。

总结一下，在信号的世界中，你可以直接丢弃 `ngOnChanges`。

## ngOnDestroy

`ngOnDestroy` 钩子主要用于在组件上触发清理操作。

以下是一个简单的 timeout 需要在销毁时清除的例子：

```typescript
@Component({ /** ... */ })
export class FooComponent {
  intervalId;

  constructor() {
    intervalId = setInterval(...);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
```

从 Angular 16 开始，我们有了一个新的上下文感知"服务" `DestroyRef` 来处理清理工作。

```typescript
@Component({
  /** ... */
})
export class FooComponent {
  constructor() {
    const intervalId = setInterval(() => {}, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
  }
}
```

它的 `onDestroy` 方法回调在上下文被销毁时调用。

调用它们的上下文可以分为 3 类：

- **组件**：当在组件中注入时，`DestroyRef` 会在组件销毁时触发回调。
- **根服务**：当注入的是 `providedIn: 'root'` 服务时，回调在整个应用销毁时调用。这种情况很少发生，在常规应用的上下文中你可以认为它永远不会发生。
- **其他注入器**：当被其他注入器注入时，回调将在该注入器本身被销毁时调用。例如在 `EnvironmentInjector` 上调用 `destroy` 时。

我们可以在辅助函数中利用这种上下文感知的清理机制。

```typescript
function myFunctionThatNeedsCleanUp() {
  const destroyRef = inject(DestroyRef);

  const cleanUpOperation = someService();

  destroyRef.onDestroy(() => cleanUpOperation());
}
```

当在注入上下文中运行时，这个函数提供了自己的清理逻辑。这正是框架提供的函数（如 `toSignal()`）所做的事情——在上下文被销毁时取消订阅 observable。

## "After" 钩子

在这类钩子中，我们将讨论 `ngAfterViewInit`、`ngAfterViewChecked`、`ngAfterContentInit`、`ngAfterContentChecked`。

我们主要依赖这些钩子来在组件渲染完成时获得通知。

```typescript
@Component({ template: '<canvas #myCanvas></canvas>' })
export class FooComponent {
  myCanvas = viewChild('myCanvas');

  // 创建时运行一次
  ngAfterViewInit() {
    initCharts(this.myCanvas());
  }

  // 每次变更检测时运行
  ngAfterViewChecked() {
    ...
  }
}
```

每当你想在 Angular 完成应用渲染时得到通知，你可以使用 `afterNextRender()` 和 `afterRender()`。前者只运行一次回调，而后者在每个渲染周期后都会运行。

### 运行一次

```typescript
@Component({ template: "<canvas #myCanvas></canvas>" })
export class FooComponent {
  myCanvas = viewChild("myCanvas");

  constructor() {
    afterNextRender(() => {
      // 在应用渲染后运行一次
      initCharts(this.myCanvas());
    });
  }
}
```

替代 `ngAfterContentInit`、`ngAfterViewInit`。

### 每次应用渲染时运行

```typescript
@Component({ template: "<canvas #myCanvas></canvas>" })
export class FooComponent {
  myChild = viewChild("childRef");

  constructor() {
    afterRender(() => {
      // 每次应用渲染后运行
      updateMyChild(myChild);
    });
  }
}
```

替代 `ngAfterContentChecked`、`ngAfterViewChecked`。

这与生命周期钩子有些不同——那些钩子仅限于组件范围，而新 API 会等待整个应用渲染完成。

这使得该 API 更适合访问 DOM，特别是在需要读取盒模型尺寸的场景中。当兄弟元素被渲染并导致尺寸变化时（例如应用了不同的 flex 规则），这些尺寸可能会改变。

`after(Next)Render` 还提供了另一个经常被忽视的优化：对 DOM 访问进行排序以获得更好的性能。

一些 DOM API 已知会触发昂贵的布局重排（[查看此列表](https://gist.github.com/paulirish/5d52fb081b3570c81e3a)）。混合调用读/写 API 可能会导致不必要的额外重排。

你可以指定回调的语义，帮助 Angular 对它们进行排序以确保最佳性能。

```typescript
afterRender({
  earlyRead: () => { ... },
  read: () => { ... },
  mixedReadWrite: () => { ... }, // 默认值，性能最差
  write() { ... }
});
```

## ngDoCheck

`ngDoCheck` 钩子可能是最不为人知的一个，你通常会使用它来实现自定义的变更检测。Angular 本身在 `NgForOf` 和 `NgClass` 指令中使用了它。

如今，`ngDoCheck` 可以很自然地被信号取代，你可以使用 `effect` 来处理副作用。

## 代码集中

如果我们回顾之前探讨的 `ngOnDestroy` 示例，可以看到新 API 的一个优势是它们允许代码集中（code collocation）。

### 基于钩子的方式

```typescript
@Component({ /** ... */ })
export class FooComponent {
  intervalId;

  constructor() {
    intervalId = setInterval(...);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
```

### 使用 `DestroyRef` 实现代码集中

```typescript
@Component({
  /** ... */
})
export class FooComponent {
  constructor() {
    const intervalId = setInterval(() => {}, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
  }
}

/***/

function myFunctionThatNeedsCleanUp() {
  const destroyRef = inject(DestroyRef);
  const cleanUpOperation = someService();
  destroyRef.onDestroy(() => cleanUpOperation());
}
```

- 不需要单独的类成员
- 没有额外的方法
- 整个功能集中在一个位置

## 演讲

你可以观看[我关于这个话题的演讲 ⏯](https://www.youtube.com/live/5m0eqGxrLUo?si=Rs-mD5Y_4zYBpSII&t=23477)，这是我在 NgGlühwein（2024 年 12 月，维也纳 🇦🇹）上做的分享。
