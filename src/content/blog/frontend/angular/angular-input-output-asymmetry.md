---
pubDatetime: 2026-05-29T19:35:37+08:00
title: "[译] Angular Input 与 Output 的不对称性"
slug: angular-input-output-asymmetry
featured: false
draft: false
isTranslation: true
tags:
  - angular
  - signals
  - rxjs
description: 本文探讨了 Angular 中 input() 与 output() 看似对称却本质不同的设计：input 是基于状态的通信（信号），而 output 是基于事件的通信（Observable），理解这一差异有助于正确使用 Angular 的响应式原语。
canonicalURL: https://riegler.fr/blog/2025-04-05-input-output
---

> 原文地址: https://riegler.fr/blog/2025-04-05-input-output

![封面图片](/blog-images/angular-input-output-asymmetry/andrew-ridley-jR4Zf-riEjI-unsplash.jpg)

在 Angular 中，inputs（输入）和 outputs（输出）是组件间通信的机制。`input()` 允许父组件向子组件传递数据，而 `output()` 则使子组件能够将信息传递回父组件。

`input()` 和 `output()` 常被视为对称的 API。一个典型的误解便是 `output()` 经常被错误地称为"信号输出（signal output）"。

接下来，我们将探讨它们实际上为何并非对称的 API，以及这意味着什么。

## Inputs：基于状态的通信

Inputs（输入）代表一种基于状态的通信方式，允许父组件通过属性向下传递数据，从而控制子组件的状态。

方便的是，inputs 以信号的形式来表示，这是一种响应式的、基于状态的 API。

```ts
@Component()
class MyButton {
  disabled = input<boolean>(false);
}
```

在这个例子中，`disabled` 输入可以在任意时刻被读取（它不是必填项，并且有初始值）。基于信号的响应式机制让组件能够在值发生变化时定义特定的行为。

## Output：基于事件的通信

Outputs（输出）代表一种基于事件的通信渠道，允许子组件在某件事情发生时通知父组件。它们通常由另一个事件所触发。

```ts
@Component({
  template: ` <button (click)="sendMessage()">Click Me</button> `,
})
export class ChildComponent {
  messageEvent = output<string>();

  sendMessage() {
    this.messageEvent.emit("Hello from Child!");
  }
}
```

可以看出，inputs 和 outputs 之间并没有真正的对称性。

## 信号时代的 Inputs/Outputs

如果你紧跟技术发展，你会了解到信号（signals）推崇基于状态的编程，通过声明式派生（`computed`、`linkedSignal`、`resource` 等）来管理状态。它们常常与另一种响应式原语 `Observable`（参见 [RxJs](https://rxjs.dev/)）进行比较，而 Observable 依赖的是事件。

这就是为什么定义 `input()` 时我们会得到一个信号，但 `output()` 并不依赖信号的原因。由于 Outputs 是基于事件的，它们天然适合使用 `rxjs-interop` 工具：[`outputFromObservable`](https://angular.dev/api/core/rxjs-interop/outputFromObservable)。

```ts
@Directive({...})
export class MyDir {
  nameChange$ = <some-observable>;
  nameChange = outputFromObservable(this.nameChange$);
}
```

使用 `outputFromObservable` 可以实现一对一的行为：每当 Observable 发出值时，都会向父组件发出一个新值。

## 将状态变更作为 Output？

随着信号在越来越多的代码库中被使用，我们看到了一些有趣的功能请求。例如[请求一个 `outputFromSignal` 辅助函数](https://github.com/angular/angular/issues/58680)。

这是个很有意思的想法，因为它会在基于状态的世界和基于事件的世界之间创建新的接口。从本质上讲，这样的辅助函数的行为等同于 `outputFromObservable(toObservable(mySignal())`。
