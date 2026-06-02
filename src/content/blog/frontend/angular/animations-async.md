---
pubDatetime: 2026-05-30T14:23:11+08:00
title: "[译] 延迟加载 Angular 的动画模块"
slug: animations-async
featured: false
draft: false
isTranslation: true
tags:
  - angular
  - animations
  - lazy-loading
description: "主包中的内容减少了几 kB"
canonicalURL: https://riegler.fr/blog/2023-10-04-animations-async
---

> 原文地址: https://riegler.fr/blog/2023-10-04-animations-async

Angular v17 的第一个 RC 即将到来，让我们来看看本周“下一个”版本中的一个有趣功能：延迟加载！

Angular 中的 [animation package](https://angular.io/guide/animations) 允许开发人员通过定义状态、转换和触发器轻松地将动画添加到其组件中。例如，`@angular/material` 模块使用该模块。

虽然实用，但该软件包的成本约为 60kB（或压缩后的 16kB），占整个 `ng new` 应用程序的 72%（从路由器和通用模块中剥离约 82kB）。这使得这个包成为延迟加载的主要候选者。

## 当前实施情况

在 Angular 中，负责渲染的类应该实现 `Renderer2`。默认情况下，Angular 使用（私有）`DomRenderer2` 将模板渲染到 DOM 中。

当您使用 `BrowserAnimationsModule` 模块或 `provideAnimations` 函数启用动画时，将提供新的动画感知 `RendererFactory2` 实现（称为 `AnimationRendererFactory`）。该工厂用于生成渲染器的动画感知实例（称为 `AnimationRenderer`）。这两个类都在代码中直接引用，因此它们（及其所有依赖项）都急切地包含在主包中。

默认渲染器 `DomRenderer` 不支持动画属性。它甚至抛出著名的错误 `Found the synthetic property @...` 来提醒开发人员在应用程序上启用动画。

## 引入延迟加载，同时保持 API 同步

`Renderer2` 接口定义的渲染 API 是完全同步的，可以追溯到 Angular v4。
使其异步将是一个巨大的突破性改变，因此这个想法被放弃了。有了这个心，
必须找到一种替代方案，在延迟加载动画渲染器的同时急切地返回渲染器。

选择的解决方案是依赖 [delegation pattern](https://en.wikipedia.org/wiki/Delegation_pattern)：一个新的 `RendererFactory2`，`AsyncAnimationRendererFactory` 将创建 `DynamicDelegationRenderer`。在等待动画模块加载并将委托渲染器切换到 `AnimationRenderer` 时，该渲染器将依赖于默认渲染器。

瞧，我们刚刚制作了一个与异步加载兼容的同步 API。

## 使用新的动画 API

该 API 从 `17.0.0-next.7` 开始可用。

要启用动画包的延迟加载，您必须通过从 `@angular/platform-browser/animations/async` 而不是 `provideAnimations()` 调用 `provideAnimationsAsync()` 来设置提供程序。它接受一个可选参数来使用 noop 动画。

#### **`main.ts`**

```
bootstrapApplication(AppComponent, {
  providers: [
    provideAnimationsAsync(),
    provideRouter([ ... ]), // my animated components
  ],
})
```

为了确保整个动画包不会被急切加载，`@angular/animation` 只能在延迟加载的组件上导入（延迟加载的路由、@defer'ed 组件等）。

## Implications

### 动态渲染器的后果

拥有一个切换其委托实现的渲染器会对角度应用程序产生直接影响。
让我们回顾一下缺点。

On bootstrap, the renderer will always be the default one: the `DomRenderer`. This renderer isn't able to process animation instructions (states, transitions...).
因此，如果我们有一个组件，那么样式将是一个空操作：

```
@Component({
  animations: [
    trigger('openClose', [
      state('open', style({  background: 'chartreuse' })),
      state('closed', style({  background: 'blue' })),
      transition('open => closed', [animate('1s')]),
      transition('closed => open', [animate('0.5s')]),
    ]),
  ],
  standalone: true,
})
export class OpenCloseComponent {
  isOpen = true;

  toggle() {
    this.isOpen = !this.isOpen;
  }
}
```

在示例中，`DomRenderer` 无法应用初始样式，该样式应为 `background: chartreuse`。
直到 `AnimationRenderer` 被 `DynamicDelegationRenderer` 拾取后，样式才会更新为预期的颜色。

### 延迟加载和代码分割

当 `@angular/animation` 包从未被急切加载时，此功能最有意义。
如果急切加载的组件使用此包中的函数，则整个包不会被拆分为单独的包，并且延迟加载将毫无用处。

这很容易检查我们自己的代码库，但在使用库时可能会变得很棘手。您可能会遇到问题的是 `@angular/material`。这个官方的 Angular 包（从 v17 开始）严重依赖动画模块。大约 15 个材料组件正在导入 `@angular/animations`。如果您在非延迟加载组件中使用其中之一，这将破坏代码分割。

因此，请小心您在非延迟加载组件上使用/导入的组件！

## 我的延迟加载有效吗？

通过检查 CLI 的服务/构建输出，可以检查您的应用程序中是否正确实现了代码分割/延迟加载。
如果您使用基于 webpack 的构建器 `@angular-devkit/build-angular:browser`，则可以在 `angular.json` 中启用 `namedChunk` 选项并检查输出：

```
Lazy Chunk Files                                                   | Names                      |  Raw Size
node_modules_angular_animations_fesm2022_browser_mjs.js            | angular-animations-browser | 176.66 kB |
default-node_modules_angular_animations_fesm2022_animations_mjs.js | app-open-close-component   |  39.20 kB |
src_app_open-close_component_ts.js                                 | app-open-close-component   |   4.45 kB |
```

在这里我们可以看到 `@angular/animations` 和 `@angular/animations/browser` 都位于单独的包中。我们的延迟加载有效🎉🎉

注意：使用 esbuild 构建器命名的块正在等待 [this PR](https://github.com/angular/angular-cli/pull/25913)。

## 最后一句话

新的 API 已作为开发者预览版提供，请 [report any issues](https://github.com/angular/angular/issues/new/choose) 您可能遇到的情况。

如果您对此新功能有任何疑问，请随时通过 [Twitter](https://twitter.com/Jean__Meche) 与我联系！
