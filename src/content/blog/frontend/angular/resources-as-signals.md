---
pubDatetime: 2026-05-30T14:35:22+08:00
title: "[译] Resource: async loading with signals"
slug: resources-as-signals
featured: false
draft: true
isTranslation: true
tags:
  - angular
  - signals
description: "谁说你需要效果？"
canonicalURL: https://riegler.fr/blog/2024-10-18-resources-as-signals
---

> 原文地址: https://riegler.fr/blog/2024-10-18-resources-as-signals

定义 API 和围绕它们的模式是一项需要时间、反馈循环和后退一步的任务。
随着 Signal API 在 Angular 中的成熟（其中大多数在 v19 中升级为稳定版本，`effect` 除外），
是时候看看更高级的模式了。

`effect` 的使用一直是一个有争议的话题，Angular 团队的框架负责人 Alex Rickabaugh 在 [recommending to use them as less as possible](https://www.youtube.com/watch?v=aKxcIQMWSNU) 上直言不讳。
还有其他选择，通常是在 if 之上的抽象，可以更多地表达开发人员的意图。

## 介绍 `resource` API。

`resource` API 是旨在抽象 `effect` 用法并提供更具声明性的基于信号的 API 的 API 之一
用于异步加载数据。

`resource` 至少需要一个返回异步数据并返回 `WritableResource` 包装对象的 `loader`。
`loader` 函数被急切地调用（作为 `effect` 的一部分）。

```
import {resource} from '@angular/core';

@Component({
  template: `
    value: {{ myResource.value() }}
  `,
})
export class MyComponent {
  myResource: WritableResource = resource({
    loader: () => {
      return Promise.resolve('My data is loaded');
    },
  });
}
```

此示例将在数据加载之前不显示任何内容 (`undefined`)，并在承诺解决后显示 `My data is loaded`。

## 加载状态作为关键信息

当我们异步加载数据时，跟踪加载状态非常重要。
正在加载吗？完成了吗？我收到错误了吗？

众所周知，`isLoading` 布尔值被认为是一种反模式，因为它缺乏大量相关信息。

一个`WritableResource`包含3个关键信息。

- `value`，加载的信号包装值
- `status`，加载状态的信号包裹值（`'idle' | 'error' | 'loading' | 'refreshing' | 'resolved' | 'local'`）
- `error`，一个信号包装对象，用于显示错误的详细信息，加载导致错误。

如果我们在 `effect` 中捕获这一点，我们将观察到以下内容：

#### `Capturing resource changes`

```
effect(() => {
  console.log('value: ', this.myResource.value());
  console.log('status: ', this.myResource.status(), myResource.status());
  console.log('error: ', this.myResource.error());
});
```

#### `Output`

```
value: undefined
status: 0 Idle
error: undefined

value: 'My data is loaded'
status: 3 Resolved
error: undefined
```

## 获取数据

您可能会使用 `resource` 通过 HTTP 获取异步数据，但它也可以是基于承诺的任何其他异步 API。
我们以使用 `fetch` 为例。

### `Basic fetch resource example`

`fetch` 返回一个承诺，该承诺被传递给作为加载器的 `resource`。 `fetch` 请求立即发出（作为 `effect()` 的一部分），无需
任何使用 `WritableResource` 的模板或附加 `effect`。

```
postResource = resource({loader: () => fetch(`https://dummyjson.com/posts/1`)});
```

## 对信号变化做出反应

缺失的组成部分之一是对信号变化做出反应并因此重新加载数据。
`resource` API 通过将依赖项声明为 `request` 的一部分来满足此要求。

### 聆听信号变化

The dependencies are declared as part of the `request` callback.

```
postResource = resource({
  request: this.postId, // this could be one of your signal inputs
  loader: ({request: postId}) => return fetch(`https://dummyjson.com/posts/${postId}`),
});
```

作为加载器回调的一部分读取的信号不会在更改时触发进一步加载
（`loader` 的执行是`untracked`）。

如果您问自己为什么不跟踪加载程序函数，那是因为加载程序函数的异步部分不会被跟踪。
因此，为了使其反应性更加清晰，反应部分 (`request`) 被分离为加载部分 (`loader`)。

#### `If the loader was a reactive context`

```
postResource = resource({
  request: () => this.postId(),
  loader: async ({request}) => {
    // signals can be tracked
    const response = await fetch(`https://dummyjson.com/posts/${request}`);
    const result = await response.json();
    // signals can't be tracked
  },
});
```

### 聆听多个信号变化

更现实的用例是一次监听多个信号并对变化做出反应
他们每个人的。

```
postResource = resource({
  request: () => ({limit: this.limit(), filter: this.filter(), select: this.select()}),
  loader: ({request: {limit, filter, select}}) => {
    return fetch(`https://dummyjson.com/posts/search?q=${filter}&limit=${limit}&select=${select}`);
  },
});
```

### 跳过请求

加载程序根据请求本身有条件地触发。如果它返回 `undefined`，加载程序将不会启动。
这样您就可以跳过某些请求（状态保持为 `idle`，直到第一个请求触发）。

```
postResource = resource({
  request: () => (this.postId() > 5 ? this.postId() : undefined),
  loader: ({request}) => {
    return fetch(`https://dummyjson.com/posts/${request}`).then((res) => res.json());
  },
});
```

### 完整的获取资源示例

更现实的是，我们会将响应解析为 JSON，并可能想要插入 `abortSignal`。
当其中一个信号接收到新值时，`abortSignal` 将用于取消待处理的请求。

```
postResource = resource({
  request: () => ({limit: this.limit(), filter: this.filter(), select: this.select()}),
  loader: ({request: {limit, filter, select}, abortSignal}) => {
    return fetch(`https://dummyjson.com/posts/search?q=${filter}&limit=${limit}&select=${select}`, {
      signal: abortSignal,
    }).then((res) => res.json() as Promise<Post[]>);
  },
});
```

## 刷新数据

如果您的资源数据在服务器上失效，想象一下删除帖子，例如您想刷新本地数据
从服务器获取最新状态。为此，您将使用 `reload()` 方法。

如果您的资源尚未加载 (`status() === 'loading'`)，`reload()` 将设置您的资源状态
到 `'reloading'`，并发送新请求。
与此同时，您的资源将保留其先前的值，直到收到新的值。

```
import {resource} from '@angular/core';

@Component()
export class MyComponent {
  postResource = resource({
    loader: () => {
      return fetch(`https://dummyjson.com/posts/search?limit=${limit}`).then(
        (res) => res.json() as Promise<Todo[]>,
      );
    },
  });

  /* Invalidate local data & request the new state */
  reload() {
    this.postResource.reload();
  }
}
```

如果您想取消任何待处理的请求，`reload()` 它不是您正在寻找的工具。
`resource` will cancel any request on dependency changes.这些在 `request` 属性中表示为信号。

## 作为可写本地状态的资源

使用 `resource` API 时，您将创建一个 `WritableResource`。这个`WritableResource`代表一个本地状态
您的服务器上的资源。

该状态也是本地可写的，`WritableResource.set()` 将允许您以编程方式设置本地值。
覆盖资源的值会将其设置为 `status` 符号到 `'local'`。

如果您想将此资源公开为只读，则 `WritableResource.asReadonly()` 将返回一个只读 `Ressource`，该资源可以与应用程序的其他部分共享，从而冒暴露可写行为的风险。

## RxJS 作为一等公民：`rxResource`

Angular 团队已经多次提到过，RxJS 是一等公民，
虽然 Angular 不应该要求您学习/使用 RxJS，但将 RxJS 与 Angular 一起使用应该感觉像是一种自然、优雅的体验。

到目前为止，我们只讨论了 `resource` 作为基于 Promise 的 API。 v19 还将引入基于 `Observable` 的对应版本：来自 `@angular/core/rxjs-interop` 模块的 `rxResource`。

### 基于可观察的示例

````
effect(() => {
  console.log('value: ', this.myResource.value());
  console.log('status: ', this.myResource.status(), myResource.status());
  console.log('error: ', this.myResource.error());
});
```0

与 `resource` 相同，`rxResource` 返回 `WritableResource`。
每次 `request` 中注册的信号发生变化时，加载程序（此处为 http 请求）将重新发出，并更新 `WritableResource` 及其信号。

#### 单发射陷阱

需要注意的是，如果返回到加载器的可观察对象发出多个值，则只有第一个值会传递给资源。
这是因为资源在实际收到新值之前无法知道新请求何时开始。

#### `not a pulling example`

````

effect(() => {
console.log('value: ', this.myResource.value());
console.log('status: ', this.myResource.status(), myResource.status());
console.log('error: ', this.myResource.error());
});

```1

此示例不会实现基于信号的拉动。如前所述，只有第一个值会传递给资源。
仅当发出 `postId` 信号时才会发出新请求。

## 最后的话

`resource` API 及其互操作对应项作为 [experimental APIs](https://angular.dev/reference/releases#experimental) 发布。
这意味着它们可能根本不会变得稳定，或者在稳定之前发生重大变化。

请随时向团队报告 [any feedback](https://github.com/angular/angular/issues/new)。
```
