---
pubDatetime: 2026-05-30T14:21:35+08:00
title: "[译] 在 Angular 中延迟加载服务并考虑测试"
slug: lazy-loading-mockable
featured: false
draft: false
isTranslation: true
tags:
  - angular
  - dependency-injection
  - lazy-loading
description: "我们应该能够模拟我们延迟加载的内容"
canonicalURL: https://riegler.fr/blog/2023-09-30-lazy-loading-mockable
---

> 原文地址: https://riegler.fr/blog/2023-09-30-lazy-loading-mockable

构建 SPA 时，捆绑包大小是一个关键主题。它越大，启动应用程序所需的时间就越长。
框架和开发人员越来越依赖延迟加载来延迟非必要代码的加载。最常见的是延迟加载的路由。

当涉及到服务时，我们可以通过使用动态 `import()` 来延迟加载它。
我们以页面显示我们想要延迟加载的大量 WebGL 动画的情况为例。

我们假设 `HomeAnimation` 是 `Injectable({providedIn: 'root'})` 的 Angular 服务。

#### **`home.component.ts`**

```
class HomeComponent {
  injector = inject(Injector);
  ...
  private async loadHomeAnimation() {
    const HomeAnimation = import('./services/home-animation.service').then((c) => c.HomeAnimation),
    this.injector.get(HomeAnimation);
    this.homeAnimation.init(this.element);
  }
}
```

这非常简单，但有一个主要缺点：这不允许我们在单元测试中使用模拟服务。

## 利用依赖注入

DI 是一个强大的工具，我们将在这里利用它来创建/共享实例并帮助测试。

首先让我们从这个辅助函数开始。

```
export async function injectAsync<T>(
  injector: Injector,
  providerLoader: () => Promise<ProviderToken<T>>,
): Promise<T> {
  const injectImpl = injector.get(InjectAsyncImpl);
  return injectImpl.get(providerLoader);
}
```

注入器将在这里做两件事：

- 检索 `InjectAsyncImpl` 的实例，该类提供延迟加载的实现
- 创建我们刚刚加载的服务的实例（该类必须可供注入器使用，因此您必须将 `@Injectable({providedIn: 'root'})` 添加到要延迟加载的类中）

`InjectAsyncImpl` 类可以非常简单：

#### **`inject-async.ts`**

```
@Injectable({providedIn: 'root'})
class InjectAsyncImpl<T> {
  async get(injector: Injector, providerLoader: () => Promise<ProviderToken<T>>): Promise<T> {
    const type = await providerLoader();

    return injector.get(type)
  }
}
```

通过此实现，我们现在可以在单元测试中重写 `InjectAsyncImpl` 的提供程序，以返回延迟加载服务的模拟实例。

#### **`my-test.spec.ts`**

```
TestBed.configureTestingModule({
  providers: [
    { provide: InjectAsyncImpl, useValue: { get () => Promise.resolve(MyMockedService) }}
  ]
});
```

我们当前的实现可行，但 DX 还远未达到理想水平。模拟一个延迟加载的服务很容易，我们必须为每个模拟的服务创建一个不同的类/对象。因此，让我们重构它以改进它。

## 改善DX

为了简化对延迟加载服务的模拟，我们将在实现中添加对覆盖的支持。

#### **`inject-async.ts`**

```
@Injectable({ providedIn: 'root' })
class InjectAsyncImpl<T> {
  private overrides = new WeakMap(); // no need to cleanup
  override<T>(type: Type<T>, mock: Type<unknown>) {
    this.overrides.set(type, mock);
  }

  async get(injector: Injector, providerLoader: () => Promise<ProviderToken<T>>): Promise<T> {
    const type = await providerLoader();

    // Check if we have overrides, O(1), low overhead
    if (this.overrides.has(type)) {
      const module = this.overrides.get(type);
      return new module();
    }
  }
}
```

这些覆盖将由辅助函数设置

```
export function mockAsyncProvider<T>(type: Type<T>, mock: Type<unknown>) {
  return [
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        inject(InjectAsyncImpl).override(type, mock);
      },
    },
  ];
}
```

`ENVIRONMENT_INITIALIZER` 是一个用于初始化函数的多提供商令牌，该函数将在构建环境注入器时运行。因此，在设置每个模拟服务时都会调用 `override` 方法。

现在我们有了一个漂亮干净的测试设置！

#### **`my-test.spec.ts`**

```
 * TestBed.configureTestingModule({
 *     providers: [
 *       mockAsyncProvider(MyFooService, MyFakeService)
 *       mockAsyncProvider(MyBarService, MyBarService)
 *   ]
 * });
```

## Improving Angular integration

当在根中提供服务时，该服务将由根注入器创建。
这样做的一个主要缺点是永远不会触发 `DestroyRef.onDestroy`。

从 [official docs](https://angular.io/api/core/DestroyRef)：

> 如果 DestroyRef 被注入到组件或指令中，则回调将在该组件或指令被销毁时运行。否则，当相应的注入器被销毁时，回调将运行。

因此，如果我们想要一个延迟加载的服务被创建它的组件破坏，我们需要更改我们的实现。

我们的限制是：

- 该服务不能是 `providedIn: 'root'`（我们希望它与 `NodeInjector` 一起被销毁）
- The service cannot be provided on the component, this would break the lazy loading
- 我们无法向注入器添加类，我们需要创建一个新类。

考虑到这一点，我们将添加以下内容

```
if (!(injector instanceof EnvironmentInjector)) {
  // We're passing a node injector to the function

  // This is the DestroyRef of the component
  const destroyRef = injector.get(DestroyRef);

  // This is the parent injector of the environmentInjector we're creating
  const environmentInjector = injector.get(EnvironmentInjector);

  // Creating an environment injector to destroy it afterwards
  const newInjector = createEnvironmentInjector([type as Provider], environmentInjector);

  // Destroy the injector to trigger DestroyRef.onDestroy on our service
  destroyRef.onDestroy(() => {
    newInjector.destroy();
  });

  // We want to create the new instance of our service with our new injector
  injector = newInjector;
}
return injector.get(module)!;
```

如果我们回到最初的示例，这就是我们如何使用新的辅助方法来延迟加载 HomeAnimation 服务。

```
export class HomeComponent {
  private readonly injector = inject(Injector); // The Node injector

  ...

  private async loadHomeAnimation() {
    this.homeAnimation = await injectAsync(this.injector, () =>
      import('./services/home-animation.service').then((c) => c.HomeAnimation),
    );

    this.homeAnimation.init(this.element);
  }
}
```

这里重要的是注入器是 `NodeInjector` 而不是 `EnvironmentInjector`。
前者将随组件一起被破坏，而后者将在组件中幸存下来。

## 最终实施

这是 `inject-async.ts` 辅助函数的最终实现。

```
import {createEnvironmentInjector, DestroyRef, ENVIRONMENT_INITIALIZER, EnvironmentInjector, inject, Injectable, Injector, Provider, ProviderToken, Type,} from '@angular/core';

/**
 * inject a service asynchronously
 *
 * @param: injector. If the injector is a NodeInjector the loaded module will be destroyed alongside its injector
 */
export async function injectAsync<T>(
  injector: Injector,
  providerLoader: () => Promise<ProviderToken<T>>,
): Promise<T> {
  const injectImpl = injector.get(InjectAsyncImpl);
  return injectImpl.get(injector, providerLoader);
}

@Injectable({providedIn: 'root'})
class InjectAsyncImpl<T> {
  private overrides = new WeakMap(); // no need to cleanup
  override<T>(type: Type<T>, mock: Type<unknown>) {
    this.overrides.set(type, mock);
  }

  async get(injector: Injector, providerLoader: () => Promise<ProviderToken<T>>): Promise<T> {
    const type = await providerLoader();

    // Check if we have overrides, O(1), low overhead
    if (this.overrides.has(type)) {
      const module = this.overrides.get(type);
      return new module();
    }

    if (!(injector instanceof EnvironmentInjector)) {
      // We're passing a node injector to the function

      // This is the DestroyRef of the component
      const destroyRef = injector.get(DestroyRef);

      // This is the parent injector of the environmentInjector we're creating
      const environmentInjector = injector.get(EnvironmentInjector);

      // Creating an environment injector to destroy it afterwards
      const newInjector = createEnvironmentInjector([type as Provider], environmentInjector);

      // Destroy the injector to trigger DestroyRef.onDestroy on our service
      destroyRef.onDestroy(() => {
        newInjector.destroy();
      });

      // We want to create the new instance of our service with our new injector
      injector = newInjector;
    }

    return injector.get(module)!;
  }
}

/**
 * Helper function to mock the lazy-loaded module in `injectAsync`
 *
 * @usage
 * TestBed.configureTestingModule({
 *     providers: [
 *     mockAsyncProvider(SandboxService, fakeSandboxService)
 *   ]
 * });
 */
export function mockAsyncProvider<T>(type: Type<T>, mock: Type<unknown>) {
  return [
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        inject(InjectAsyncImpl).override(type, mock);
      },
    },
  ];
}
```
