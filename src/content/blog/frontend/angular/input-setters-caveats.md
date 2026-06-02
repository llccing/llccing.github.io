---
pubDatetime: 2026-05-30T14:32:13+08:00
title: "[译] 用 input() 信号替换 @Input 设置器"
slug: input-setters-caveats
featured: false
draft: false
isTranslation: true
tags:
  - angular
  - signals
description: "了解输入设置器的注意事项"
canonicalURL: https://riegler.fr/blog/2024-05-01-input-setters-caveats
---

> 原文地址: https://riegler.fr/blog/2024-05-01-input-setters-caveats

拥有输入设置器是角度应用程序中非常常见的一种模式，它通常用于在输入值发生变化时（重新）采取行动。

#### `Input setter example`

```
class MyComponent {
  _isEnabled: boolean = false;
  @Input() set isEnabled(value: unkown) {
    _isEnabled = !!value;
  }
}
```

**首先是免责声明**，输入设置器（或与此相关的更改检测内的任何生命周期事件）本质上并不是坏事。
例如，如果您将新值强制为布尔值或类似值，则可以使用它们。

但由于 setter 运行时（在变更检测期间），我们应该注意两个半独立的问题。您在其中可以/应该做什么有额外的限制，而且这些限制可能很微妙。

很容易意外地做错事，其后果包括性能下降、`ExpressionChanged` 以及 UI 未按预期更新等。

## 输入设置器，注意事项

### 1. 易出现故障的输入读取

输入设置器可能会出现问题，因为它们在每个输入单独设置时运行。在设置器中，您不能假设所有输入都有其更新值。
当您的应用程序深深需要该更改的后果时，麻烦就开始了。我们见过人们在谈论某个话题时遇到麻烦。

```
class MyComponent {
  inputSubject = Subject()
  @Input() value(value: MyType) {
    this.inputSubject.next(value);
  }
}
```

当您处理下一个主题时，您将使用该新值同步运行所有下游订阅者。如果这些 Observable 链也使用其他输入值，那么您刚刚创建了一个竞争条件。

```
class MyComponent {
  inputSubject = Subject()
  @Input() value(value: MyType) {
    this.inputSubject.next(value);
  }

  @Input() key: string;

  constructor() {
    this.inputSubject.subscribe((value) => {
      update(value[this.key]) // could crash if `key` input is updated after value
    })
  }
}
```

最好的情况是，您的订阅者将在设置下一个输入时重新运行，等等。最坏的情况是，您违反了某些不变量并崩溃。有时，输入只是碰巧以正确的顺序设置，一切正常，直到一年后有人进行随机更改，导致输入以不同的顺序设置，从而暴露了错误。

### 2. 变更检测期间数据流发生变化

更一般地说，您在更改检测期间采取的任何操作（例如，在像 `ngOnChanges` 这样的生命周期挂钩中）都有警告：您不应该针对 Angular 自上而下的单向数据流进行更改。

如果您只是更新本地组件状态或影响子组件的状态，那就没问题。但是，没有什么可以阻止您执行 `globalStore.dispatch(HEY_MY_INPUT_CHANGED)` 之类的操作并触发整个应用程序的更新，其中一些可能是 `NG0100 ExpressionChanged`。

## 利用信号进行无故障的更改

许多功能或信号之一是无故障：您无需考虑在更改检测过程中更新数据的限制或输入设置的顺序。

这就是为什么 `input()` 信号与 `computed()` 或 `effect()` 如此良好的原因。

```
class MyComponent {
  value = input.required<MyType>();
  key = input.required<string>();

  private updater = effect(() => {
    // No worry about the order
    update(this.value()[this.key()])
  })
}
```

## 笔记

我要感谢 [Alex Rickabaugh](https://twitter.com/synalx) 巩固了我对这个主题的想法。
