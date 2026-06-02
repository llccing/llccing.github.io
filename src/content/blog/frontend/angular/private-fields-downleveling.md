---
pubDatetime: 2026-05-30T14:33:31+08:00
title: "[译] 了解 Angular 中的私有属性降级"
slug: private-fields-downleveling
featured: false
draft: false
isTranslation: true
tags:
  - angular
  - tooling
description: "以及有关 browserslist 和 Esbuild 集成到 Angular 的更多信息"
canonicalURL: https://riegler.fr/blog/2024-05-17-private-fields-downleveling
---

> 原文地址: https://riegler.fr/blog/2024-05-17-private-fields-downleveling

如果您在社交网络上关注过我，您可能会看到我撰写有关 [private class properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties) 及其缺点的文章。

Here is a private properties and a property with a typescript `private` attribute.

```
class Foo {
  #myPrivateFoo = 'foo'; // not accessible outside the class
  private notSoPrivateFoo = 'foo'; // accessible at runtime outside the class
}
```

让我们深入探讨一下为什么在使用私有属性之前需要小心。

## 性能陷阱

目前 [Google Typescript Style Guide](https://google.github.io/styleguide/tsguide.html#class-members) 非常明确，建议不要使用私有类属性。

> 不要使用私有字段（也称为私有标识符）
>
> 当 TypeScript 降低级别时，私有标识符会导致大量的排放大小和性能下降，并且在 ES2015 之前不受支持。它们只能降级到 ES2015，而不能更低。同时，当使用静态类型检查来增强可见性时，它们并没有提供实质性的好处。

这里有一些解释，通过比较 esbuild 的 `ES2021` 中的 typescript 和 javascript 输出。 （`ES2021` 是最后一个不支持私有属性的目标）。

#### `Typescript class`

```
class Foo {
 #bar = 'bar';

   constructor() {
     this.#bar
   }
}
```

#### `Downleveled javascript class`

```
// Helpers functions

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError('Cannot ' + msg);
var __privateGet = (obj, member, getter) => (
  __accessCheck(obj, member, 'read from private field'), getter ? getter.call(obj) : member.get(obj)
);
var __privateAdd = (obj, member, value) =>
  member.has(obj)
    ? __typeError('Cannot add the same private member more than once')
    : member instanceof WeakSet
    ? member.add(obj)
    : member.set(obj, value);

// Class Impl

var _bar;
class Foo {
  constructor() {
    __privateAdd(this, _bar, 'bar');
    __privateGet(this, _bar);
  }
}
_bar = new WeakMap();
```

[Live example by Esbuild](https://esbuild.github.io/try/#YgAwLjIxLjMALS10YXJnZXQ9ZXMyMDIxAGUAZW50cnkuanMAY2xhc3MgRm9vIHsKICNiYXIgPSAnYmFyJzsKCiAgIGNvbnN0cnVjdG9yKCkgewogICAgIHRoaXMuI2JhcgogICB9Cn0K)。

正如您所看到的，降低私有属性的级别负责将 `WeakMap` 引入 javascript 实现中。这就是前面提到的性能回归的原因。

## Angular、构建目标和浏览器支持

> 2024 年 1 月编辑：以下段落适用于 v18。

从 Angular 15 开始，Angular CLI 强制将 typescript 目标设置为 `ES2022`。这意味着打字稿编译器（`tsc`）输出不会降低私有属性的级别。

那么为什么仍然不推荐使用私有字段呢？

让我们回到 Angular CLI 和应用程序构建器的工作原理：

```
flowchart LR


A[TS File] --> B[TSC]
B3[Some other config...] --> C
B --> C[ES Build]
B2[Browserslist] --> C
C --> D[Babel plugins]
```

使用应用程序生成器时，esbuild 处理来自 `tsc` 的 JavaScript 输出以及浏览器列表配置。

CLI 使用的默认浏览器列表配置如下：

```
last 2 Chrome versions
last 1 Firefox version
last 2 Edge major versions
last 2 Safari major versions
last 2 iOS major versions
Firefox ESR
```

[Source](https://github.com/angular/angular-cli/blob/7a539ab39ca3e0f70b3cf3b12da5a024cde72865/packages/angular/build/src/utils/supported-browsers.ts#L15-L21)

在撰写本文时，这导致以下浏览器支持：

```
 'chrome124.0', 'chrome123.0',  'edge123.0',
  'edge122.0',   'firefox125.0', 'firefox115.0',
  'ios17.4',     'ios17.3',      'ios17.2',
  'ios17.1',     'ios17.0',      'ios16.6',
  'ios16.5',     'ios16.4',      'ios16.3',
  'ios16.2',     'ios16.1',      'ios16.0',
  'safari17.4',  'safari17.3',   'safari17.2',
  'safari17.1',  'safari17.0',   'safari16.6',
  'safari16.5',  'safari16.4',   'safari16.3',
  'safari16.2',  'safari16.1',   'safari16.0'
```

[Browserlist compatible browser](https://browsersl.ist/#q=last+2+Chrome+versions%0Alast+1+Firefox+version%0Alast+2+Edge+major+versions%0Alast+2+Safari+major+versions%0Alast+2+iOS+major+versions%0AFirefox+ESR)。

Esbuild 对浏览器支持哪些功能有基本的了解，并且能够降级以匹配支持的浏览器。

例如，如果您将 `--target=safari16` 替换为 `--target=safari15`，您将看到使用后者时您的私有属性将被降级。 [Demo here](https://esbuild.github.io/try/#YgAwLjIxLjMALS10YXJnZXQ9c2FmYXJpMTYAZQBlbnRyeS5qcwBjbGFzcyBGb28gewogI2JhciA9ICdiYXInOwoKICAgY29uc3RydWN0b3IoKSB7CiAgICAgdGhpcy4jYmFyCiAgIH0KfQo)。

但是...如果列表中的每个浏览器都支持私有属性，为什么我的私有属性会使用默认配置降低级别？

## Angular 细节和部分 Safari 支持

虽然 Safari 支持私有属性，但当它们与静态类块一起使用时，Safari < 16.4 存在一个已知问题。

#### `A class with a static block`

```
class Foo {
 static { this.foo = undefined }
 #bar = 'bar';
}
```

[Demo on esbuild](https://esbuild.github.io/try/#YgAwLjIxLjMALS10YXJnZXQ9c2FmYXJpMTYAZQBlbnRyeS5qcwBjbGFzcyBGb28gewogc3RhdGljIHsgdGhpcy5mb28gPSB1bmRlZmluZWQgfTsKICNiYXIgPSAnYmFyJzsKCiAgIGNvbnN0cnVjdG9yKCkgewogICAgIHRoaXMuI2JhcgogICB9Cn0K)。

当它们一起使用时，Esbuild 通过降低私有属性来解决该限制。

### Angular 的静态块

您自己可能没有使用静态类块，但您必须知道 Angular 会为您做到这一点。
组件工厂 `ɵfac` 或组件元数据定义 `ɵcmp` 在静态块中定义。

#### `Angular Component`

```
@Component({
  selector: 'app-root',
  standalone: true,
  ...
})
export class AppComponent {
  #foo = 'foo';
}
```

#### `Compiler output`

```
class AppComponent2 {
  #foo = "foo";
  static {
    this.ɵfac = function (t) {
      return new (t || AppComponent2)();
    };
  }
  static {
    this.ɵcmp = ɵɵdefineComponent({
      selectors: [["app-root"]],
      standalone: !0,
      ...
    });
  }
}
```

所以当需要支持 Safari 16 时，Esbuild 会将私有属性降级。

这个具体的例子就是为什么从今天开始（直到 Safari 16 超出支持范围），不建议在 Angular 项目中使用私有属性。

## 在 Angular 上启用本机私有属性

如果您想解决 Angular CLI 的默认行为，您可以通过覆盖默认的 browserslist 配置来选择退出 Safari 16 支持：

#### `.browserslistrc`

```
last 2 Chrome versions
last 1 Firefox version
last 2 Edge major versions
last 1 Safari major versions
last 1 iOS major versions
Firefox ESR
```

## 奖金

如果您想更多地研究您的捆绑输出，我建议您通过禁用损坏来构建应用程序。

````
class Foo {
 #bar = 'bar';

   constructor() {
     this.#bar
   }
}
```0

这样，您将能够保留所有变量和类名称，同时仍然启用诸如树摇动和死代码消除（DCE）之类的优化。

## 自 v19 起

自 v19 以来，或者更准确地说，自 browserlist 更新了“最后 2 个 iOS 主要版本”的定义以排除 v16 以来，这种情况发生在 9 月中旬发布的 iOS 18 左右，Angular CLI 的默认配置不再降低私有属性的级别。如果您依赖该默认配置，您可以安全地使用私有属性并享受它带来的微小性能改进！
````
