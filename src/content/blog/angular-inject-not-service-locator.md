---
pubDatetime: 2026-05-25T16:00:00Z
title: "[译] inject 函数不是服务定位器——除非你把它用成了服务定位器"
slug: angular-inject-not-service-locator
featured: false
draft: false
isTranslation: true
tags:
  - angular
  - dependency-injection
  - frontend
description: 深入探讨 Angular 中 inject() 函数与服务定位器模式的区别，理解注入上下文的基础原理，以及如何避免将 inject() 误用为服务定位器。
canonicalURL: http://riegler.fr/blog/2025-01-08-inject-not-service-locator
---

> 原文地址: http://riegler.fr/blog/2025-01-08-inject-not-service-locator

![封面图片](/blog-images/angular-inject-not-service-locator/valeriia-miller-5y1rtaIKBj0-unsplash.jpg)

我想分享一下自己对 Angular 社区中一个热议话题的看法：使用 `inject()` 函数进行依赖注入（DI）以及注入上下文的概念。

## 服务定位器模式

服务定位器模式是软件开发中用于管理应用程序内依赖实例化和供给的一种设计模式。它涉及一个称为"服务定位器"的中央注册表，其中保存着对各种服务或对象的引用。组件不直接创建或依赖其他对象，而是通过查询服务定位器来获取所需的依赖。这种方法旨在解耦组件并简化依赖管理，使得在不修改消费代码的情况下更容易替换或配置服务。服务定位器通常用于需要依赖注入框架或基于配置的实例化的场景中。

### 为什么服务定位器被视为反模式

虽然服务定位器模式看起来很方便，但它经常受到批评，并被视为一种反模式，原因如下：

1. **隐藏依赖关系**：使用服务定位器会掩盖类的依赖关系，使其不够显式。这种不透明性会导致理解和维护代码库变得困难，因为开发者无法直观地了解一个类依赖了什么。

2. **违反依赖倒置原则**：通过依赖集中式的定位器，组件依赖于服务定位器本身而非抽象接口，这产生了隐式耦合。这破坏了"依赖于抽象而非具体实现"的原则。

3. **测试挑战**：该模式引入了类似全局状态的行为，使得隔离和测试组件变得更加困难。在测试过程中模拟或替换依赖需要额外的工作，通常还需要对服务定位器进行特殊配置。

4. **运行时故障**：由于依赖在运行时解析，诸如缺失或配置错误的服务等问题可能只有在应用运行时才会暴露出来，这使得调试更具挑战性。

5. **助长不良设计**：该模式可能助长依赖管理缺乏结构化的问题，因为开发者可能在代码的任何地方使用定位器来获取依赖，导致系统紧密耦合且模块化程度降低。

基于以上原因，依赖注入模式通常更受青睐，因为它使依赖关系显式化，鼓励遵循 SOLID 原则，并简化了测试和可维护性。

## 注入上下文基础

Angular 中的注入上下文代表一个可以执行依赖注入操作的环境。该上下文在 Angular 架构中的特定位置自动可用，但在其他位置则明显缺失。

Angular 在特定情况下自动提供注入上下文，主要是在类初始化期间（包括构造函数和属性初始化）。除此之外，你还可以在 Provider 定义和路由配置中注入依赖。这两者类似于初始化上下文——你在创建路由器时定义路由，在创建 Provider 时定义 Provider 依赖。

组件/指令的生命周期钩子（`ngOnInit`、`ngOnChanges` 等）明显在注入上下文之外执行，主要有以下几个原因：

1. 它们不是组件初始化的一部分（它们在初始化之后运行）
2. 它们可能在组件的生命周期中执行多次
3. 它们在运行时上下文而非初始化上下文中运行
4. 它们用于生命周期管理，而非依赖解析

这些设计选择对应用架构有直接影响。上述限制通过以下方式强制执行更好的架构决策：

1. 确保依赖提前声明
2. 维护清晰的依赖链
3. 防止运行时依赖解析
4. 鼓励正确的关注点分离

### 设计影响

注入上下文与生命周期钩子的分离强化了 Angular 的设计原则：

1. 清晰的初始化边界
2. 可预测的依赖解析
3. 显式的组件契约
4. 生命周期管理的分离

理解这些边界有助于开发更易维护和更可预测的 Angular 应用。现在你已经理解了在开发 Angular 应用时所处的上下文，让我们来看看为什么 `inject` 函数属于依赖注入而不是服务定位器。

## `inject` 是依赖注入，不是服务定位器

在 Angular 中，`inject` 函数用于以声明式的方式在构造函数、独立组件或初始化过程中获取依赖。虽然乍一看它可能类似于服务定位器，但它从根本上遵循依赖注入的原则，而不是服务定位器。原因如下：

1. **依赖是显式的**：与服务定位器模式中依赖被隐藏且可以在代码库任何地方访问不同，Angular 的 `inject` 函数使依赖显式化。它的作用域限定在使用它的上下文中，例如特定的 Provider 或组件内部，确保了注入内容的清晰性。

2. **框架控制的解析**：Angular 的 DI 系统由框架控制。`inject` 函数在 Angular DI 容器的约束内工作，容器根据配置来解析依赖。开发者在根级别、路由或组件中定义 Provider，Angular 负责处理这些服务的生命周期和作用域。

3. **无全局访问**：服务定位器模式的一个标志是通过集中式注册表全局访问依赖。在 Angular 中，`inject` 与 Angular 的层级式 DI 系统紧密耦合，确保依赖只在适当的上下文中被解析。这种层级化的特性避免了与服务定位器相关的全局访问问题。

4. **遵循依赖倒置原则**：使用 `inject`，可以基于抽象令牌（Token）而非具体实现来解析依赖。这种设计与依赖倒置原则一致，因为代码依赖于 Angular DI 系统提供的抽象。

总之，Angular 中的 `inject` 函数是 Angular 依赖注入系统提供的一个工具，用于在受控且显式的框架上下文中解析依赖。它通过遵循 DI 原则、确保可测试性以及提供清晰且结构化的依赖管理方式，避免了服务定位器模式的各种陷阱。

## `inject()` 何时变成服务定位器

`inject` 的问题出现在它被用于在运行时定位服务，而非在初始化时显式声明依赖的时候。

```typescript
@Injectable()
export class MyService {
  performAction(data: string) {
    // 服务定位器模式：按需查找服务
    const analyticsService = inject(AnalyticsService);
    analyticsService.track(data);
  }
}
```

`runInInjectionContext` 函数在被误用时，可能会无意中将 Angular 的依赖注入系统转变为服务定位器模式。以下是对其风险和最佳实践的详细分析。

`runInInjectionContext` 允许在 Angular 正常边界之外的注入上下文中执行代码。虽然灵活，但这可能导致有问题的模式：

```typescript
import { runInInjectionContext, inject, Injector } from "@angular/core";

export class RiskyService {
  private injector: Injector;

  // 这在构造之外创建了一个隐藏的依赖
  performAction() {
    runInInjectionContext(this.injector, () => {
      // 服务定位器模式：按需查找服务
      const analyticsService = inject(AnalyticsService);
      analyticsService.track(data);
    });
  }
}
```

### 关键风险

关键风险在于拥有在构造操作之外才需要的依赖。

虽然我们可以在单元测试中捕获这些依赖，但仅确保构造时依赖正确的基本单元测试可能会遗漏这些"隐藏"的依赖。

### 在构造操作中使用依赖解析

最佳方法是在构造期间使用 DI 来声明依赖，然后在之后使用它们：

```typescript
@Injectable()
export class RiskyService {
  // 声明的依赖
  analyticsService = inject(AnalyticsService);

  performAction() {
    // 没有依赖声明，只是使用
    analyticsService.track(data);
  }
}
```

虽然 `runInInjectionContext` 是一个强大的工具，但不当使用会导致维护噩梦和测试困难。通过遵循上述准则并尽可能优先使用构造器注入，你可以维护一个更整洁、更易维护的代码库。

## Angular 内部的 inject

与你编写应用代码的方式相同，许多服务、指令和管道已经依赖于 `inject` 函数。这对所有开发者来说大多是无感的。

值得关注的是一些依赖 inject 的函数。列举其中几个：`toSignal`、`toObservable`、`takeUntilDestroyed`、`after(Next)Render`、`afterRenderEffect` 等。

这些函数依赖注入上下文来访问 `DestroyRef` 或其他框架提供的服务。每当你在注入上下文之外调用它们时，框架会要求你提供一个 `injector` 参数。这在边界上属于服务定位器，但仍然可以接受，因为框架本身保证了这些服务在你访问它们时始终存在。在注入上下文中，这些依赖不存在未被满足的风险。

## 结论

将 Angular 的 `inject()` 函数归类为服务定位器模式与否，取决于视角和具体实现。虽然它与传统的服务定位器模式有相似之处——允许运行时服务解析，但它与 Angular 依赖注入框架的整合赋予了它独特的定位。

与软件开发中的许多模式一样，有用的模式与反模式之间的界限通常取决于其应用方式和场景。关键不在于将 `inject()` 明确归类为服务定位器或非服务定位器，而在于理解其使用可能导致服务定位器常见陷阱的上下文。

理解这些潜在陷阱——如隐藏依赖、测试困难和时序耦合——可以帮助开发者在何时以及如何使用 `inject()` 方面做出明智的决策。这些知识有助于在利用 `inject()` 提供的灵活性的同时，保持 Angular 依赖注入系统的优势。

模式本身并非天生就有问题；真正影响代码质量的是实现方式和使用上下文。通过时刻注意这些考虑因素，开发者可以有效地使用 `inject()`，同时避免传统上与服务定位器相关的缺点。

最终，目标不是避免特定的模式，而是理解它们的影响，在能带来明确收益的地方审慎使用，同时保持代码质量、可测试性和可维护性。

## 附加内容

你可能更喜欢使用 `inject` 而不是构造函数 DI 的一个原因，是按照标准的类字段新初始化顺序。在 TypeScript 中，这个特性通过 [useDefineForClassFields: true](https://www.typescriptlang.org/tsconfig/#useDefineForClassFields) 启用，并且预计将在 [TS 6.0 中被废弃](https://github.com/microsoft/TypeScript/issues/60284)。

当启用该特性时，属性在构造函数本身运行之前就被初始化了，这会导致易出错的代码：

```typescript
import { Injectable } from "@angular/core";
import { MyService } from "./my-service";

@Injectable()
export class MyComponent {
  // 字段在构造函数运行之前初始化
  private data = this.myService.getData(); // ❌ myService 是 undefined

  constructor(private myService: MyService) {}
}
```

使用 `inject` 就不再有这个问题了：

```typescript
import { Injectable, inject } from "@angular/core";
import { MyService } from "./my-service";

@Injectable()
export class MyComponent {
  private myService = inject(MyService); // ✅ 安全解析
  private data = this.myService.getData();
}
```

## 参考资料

如果你想了解关于服务定位器模式的更多参考资料，请查看：

- [控制反转容器与依赖注入模式，martinFowler.com](https://martinfowler.com/articles/injection.html#ServiceLocator) — 这被认为是最早正式定义该模式的权威参考。
- [服务定位器是一种反模式，Mark Seemann 的批判性分析](https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/) — 提供了重要的反面观点，并解释了为什么有些人将其视为反模式。
