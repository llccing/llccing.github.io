---
pubDatetime: 2026-05-30T16:10:00+08:00
title: "[译] 默认具备 Tree-shaking 能力"
slug: tree-shakable-as-default
featured: false
draft: true
isTranslation: true
tags:
  - angular
  - dependency-injection
  - tooling
description: "构建 Angular 库时，如何利用 providedIn: 'root' 与 useFactory 让抽象服务默认具备 Tree-shaking 能力，避免把未使用的代码带进最终产物。"
canonicalURL: https://riegler.fr/blog/2023-10-08-tree-shakable-as-default
---

> 原文地址: https://riegler.fr/blog/2023-10-08-tree-shakable-as-default

![封面图片](/blog-images/tree-shakable-as-default/from-marwool-GbY8Xg5iTOA-unsplash.jpg)

在构建一个库时，你写下的代码最终未必都会被用到。如果你在编写功能时没有把 Tree-shaking 放在心上，未使用的代码就可能进入最终产物。这并不好，未使用的代码本该在构建时被剔除。它就像背着一背包石头去跑步，毫无用处，只会拖慢你。

因此，在编写库时，最好从一开始就以“默认具备 Tree-shaking 能力”为目标。也就是说，你要从设计层面确保代码可以被 Tree-shaking 移除。

## 带默认 Provider 的抽象服务

在 Angular 框架中编写抽象服务时，你很可能会采用标准的 `@Injectable()`，再配上一个 provider 以及一个 `provideXXXX()` 函数，以便将默认实现保持为私有。

```ts
// my.service.ts
@Injectable()
export abstract class MyService {}

// default.service.ts
/**
 * @private // 这个类是私有的，我们不希望暴露它
 */
@Injectable()
export class DefaultService()

// providers.ts
provideAllFunctionalities() {
  return [
    // ... 其他 providers 放在前面
    { provide: MyService, useClass: DefaultService }
    // ... 其他 providers 放在后面
  ]
}
```

从功能上讲，这段代码完全能运行。对于一个不需要对服务做 Tree-shaking 的应用来说，它也完全说得通。可问题在于，`MyService` 和 `DefaultService` 都出现在 providers 数组里，因此任何调用这个函数的应用都无法把这些服务通过 Tree-shaking 剔除掉。

但在库的场景下，这就不太理想了：未使用的代码应该在构建时被剔除。

## 利用 `providedIn: 'root'`

到了这里，该如何让这个服务具备 Tree-shaking 能力呢？

在 v6 中，Angular 团队为服务引入了一个非常棒的特性，用来开箱即用地支持 Tree-shaking：`providedIn:'root'`。

当你使用 `@Injectable(providedIn: 'root')` 时，就不再需要显式声明 providers。Angular 会在服务在某处被注入时，自动把该服务的 provider 注册到根注入器上。

这正是我们将要用来为服务提供默认实现的工具。

首先，我们让服务使用 `providedIn: 'root'`，从而使它在整个应用中都可用。

```ts
@Injectable({provideIn:'root'})
export class DefaultService() {
  constructor(/* 这里放你需要的依赖 */) {}
}
```

接着，你可以把这个服务声明为你想注入的那个 Token 的默认实现。为此，我们要通过 `useFactory` 指定默认工厂。同时，我们也给 `MyService` 加上 `providedIn: 'root'`，让它本身也具备 Tree-shaking 能力。

```ts
@Injectable({
  providedIn: "root",
  useFactory: () => inject(DefaultService),
})
export abstract class MyService {}
```

因此，借助 `providedIn: 'root'`，我们无需调用 `provideAllFunctionalities`，也能直接 `inject(MyService)`。而 `useFactory` 则让 `DefaultService` 成为默认提供的实例。

这就是让一个抽象服务默认具备 Tree-shaking 能力的方式。

## 这种模式在 Angular 代码库中的应用

这种模式在 Angular 代码库中正被越来越多地采用，下面是几个例子：

- [LocationStrategy](https://github.com/angular/angular/blob/00128e38538f12fe9bc72ede9b55149e0be5ead0/packages/common/src/location/location_strategy.ts#L33)
- [TitleStrategy](https://github.com/angular/angular/blob/00128e38538f12fe9bc72ede9b55149e0be5ead0/packages/router/src/page_title_strategy.ts#L38)
- [RouteReuseStrategy](https://github.com/angular/angular/blob/00128e38538f12fe9bc72ede9b55149e0be5ead0/packages/router/src/route_reuse_strategy.ts#L41)
- [UrlHandlingStrategy](https://github.com/angular/angular/blob/00128e38538f12fe9bc72ede9b55149e0be5ead0/packages/router/src/url_handling_strategy.ts#L20)
- [UrlSerializer](https://github.com/angular/angular/blob/00128e38538f12fe9bc72ede9b55149e0be5ead0/packages/router/src/url_tree.ts#L349)
