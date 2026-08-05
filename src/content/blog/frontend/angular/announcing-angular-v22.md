---
pubDatetime: 2026-06-04T12:00:00+08:00
title: "[译] Angular v22 正式发布"
slug: announcing-angular-v22
featured: false
draft: false
tags:
  - angular
description: Angular v22 正式发布！Signal Forms、Angular Aria、异步响应式 API 三大特性同步进入生产就绪状态，全新 @Service 装饰器、injectAsync、路由增强、模板语法大升级，以及面向 AI 时代的 Agent 工具链。
---

> 原文：[Announcing Angular v22](https://blog.angular.dev/announcing-angular-v22-c52bb83a4664)  
> 作者：Angular 团队  
> 发布时间：2026 年 6 月 4 日

今天，我们无比激动地宣布 Angular v22 正式发布。每一次版本迭代，我们都为自己的工作感到自豪。我们的目标是持续输出高质量的特性与改进，无论你以何种方式构建 Angular 应用，都能拥有丝滑的开发体验。

Angular 是你在 Web 上构建下一个伟大产品的坚实基础。本次发布涵盖了稳定性、人体工程学等多方面的更新。我们希望 Angular 成为一个发射台，帮助你构建你的下一个优秀应用。

精彩内容颇多，我们直接开始吧。

---

## 生产就绪，是这次的主旋律

Angular 团队非常享受并引以为豪的一件事，是我们持续更新 API、为 Angular 带来出色新特性的能力。引入新特性时，我们通常会以实验性或开发者预览版的形式发布，给团队留出时间收集反馈、持续迭代，直到打磨出最好的版本交给社区。

这种做法的代价是：某些特性即便开发者跃跃欲试，也还未到达生产就绪的状态。在本次发布中，我们很高兴地宣布，**三项重量级 Angular 特性同步进入生产就绪的稳定状态**：Signal Forms、Angular Aria，以及异步响应式 API。

---

## Signal Forms：可组合、响应式，即刻可用 ✅

我们将 Signal Forms 设计为全新的、功能完备的表单 API。它融合了 Reactive Forms 的最佳实践、强类型表单的价值、模板驱动表单的易用性，以及 Signals 的响应式特性，共同构成了一套响应式、可组合、声明式的表单解决方案。

v21 发布 Signal Forms 后，我们收到了来自 Google 内外团队的强烈正向反馈——我们走在了正确的道路上。此后，我们对 Signal Forms 进行了以下更新：

- 在 angular.dev 上发布了完整的文档更新指南
- 解决了社区提交的大量反馈和 issue
- 新增了对 Angular Material 和 Angular Aria 的支持，为开发者提供更多表单集成选项

以下是一个包含自定义验证和模板绑定的表单实现示例：

```typescript
/**
 * Signal Forms 入门示例
 */
import { signal } from "@angular/core";
import { form } from "@angular/forms/signals";

@Component({
  selector: "app-payment",
  imports: [FormField],
  templateURL: "./app-payment.html",
})
class Payment {
  readonly paymentModel = signal({
    paymentType: "",
    amount: 0,
  });

  readonly f = form(paymentModel, schema => {
    required(schema.paymentType, {
      message: "Required field",
    });
  });
}
```

```html
<!-- app-payment.html -->
<form>
  <section>
    <label for="payment-type">Payment Type:</label>

    <select id="payment-type" [formField]="f.paymentType">
      <option value="">Select a method...</option>
      <option value="credit">Credit Card</option>
      <option value="paypal">Payment Service</option>
    </select>

    @if (f.paymentType().invalid() && f.paymentType().touched()) {
    <p class="error">
      @for (error of f.paymentType().errors(); track error.kind) {
      <span>{{ error.message }}</span>
      }
    </p>
    }
  </section>

  <button type="submit" [disabled]="f().invalid()">Submit Payment</button>
</form>
```

Signal Forms 现已准备好投入生产，前往 [angular.dev 上的更新指南](https://angular.dev/guide/forms/signal-forms) 开始使用吧。

---

## Angular Aria：为所有用户构建可访问的应用 ✅

Web 是为每个人而生的，无论他们如何与之交互：键盘和鼠标、屏幕阅读器，或其他方式。Angular 团队需要一种一致的、可访问且可定制的方式来构建组件，让应用服务于所有用户。

Angular Aria 在 v21 中迈出了这一方向的重要一步——开发者负责提供样式和业务逻辑，UI 指令和模式负责处理无障碍访问性。在此基础上，**Angular Aria 的无障碍模式合集在 v22 中正式进入生产状态**，开发者现在可以放心地将基于 Angular Aria 的组件交付给用户。

为进入生产状态，我们做了以下准备：

- API 已稳定，社区提交的众多 issue 已得到解决
- 完整支持 Signal Forms
- 提供了测试工具（Test harnesses）

Angular Aria 的 **12 种 UI 模式**覆盖了常见的无障碍模式，现已可在生产环境使用。构建让所有用户都能享用的应用吧。

---

## 异步响应式：全新的前沿 ✅

在 2024 年社区驱动的 NgPoland 大会上，Angular 团队成员 Pawel Kozlowski 分享了他的愿景：如何将 Signals 的能力延伸到开发者熟悉的同步边界之外。随后，团队开始探索，并最终迎来了一项游戏规则改变者：带有 `resource` 的异步信号。

`resource` API 为开发者铺设了一条路，让他们能够利用异步编程的非阻塞特性，同时保留标准同步信号 API 的人体工程学优雅。

```typescript
/**
 * 使用 resource 获取天气预报的代码示例
 */
import { resource, signal, computed } from "@angular/core";

const selectedCity = signal("Chicago");

const weatherResource = resource({
  params: () => ({ city: selectedCity() }),
  loader: ({ params }) => fetchWeatherForecast(params.city),
});

const currentTemperature = computed(() => {
  if (weatherResource.hasValue()) {
    return `${weatherResource.value().temperature}°F`;
  }
  return "Loading weather...";
});
```

`resource` 提供了请求异步资源的方式，而 `httpResource` 则作为其 HTTP 专用版本被引入，让通过 HTTP 获取数据变得更加直观，心智模型更加简洁：

```typescript
/**
 * httpResource 实现声明式数据获取，自动追踪 selectedCity 信号
 */
export class WeatherComponent {
  selectedCity = signal("Chicago");

  weather = httpResource<{ temperature: number; condition: string }>(
    () => `https://api.example.com/v1/forecast/${this.selectedCity()}`
  );

  changeCity(newCity: string) {
    this.selectedCity.set(newCity);
  }
}
```

**`resource` 和 `httpResource` 均已生产就绪。** 从 Angular v22 起，开发者可以放心地在生产应用中使用这两个 API，它们已经过充分的实战检验。

更多信息请访问 [angular.dev 上的官方指南](https://angular.dev/guide/signals/resource)。

---

## 迈向 Agent 时代

Angular 是构建 AI 原生应用的绝佳平台选择。自 [angular.dev/ai](https://angular.dev/ai) 上线以来，我们一直在努力以有意义的方式拓展我们的 AI 故事，与开发者并肩站在这个新时代的最前线。我们认为这体现在三个关键方面：

1. **面向代码创作的 Agent 工具**
2. **Agent 浏览器工具**
3. **AI 开发平台**

Angular 团队在这两个领域都取得了重大进展，我们迫不及待地想分享我们的工作成果。

### 面向代码创作的 Agent 工具

随着越来越多的开发者使用 Google Antigravity 等工具作为 Agent 编码伴侣，让编码 Agent 具备有效编写现代 Angular 应用所需的工具变得前所未有地重要。

我们更新了 **Model Context Protocol (MCP)** 支持，新增了在构建应用时直接与开发服务器交互的工具：

- `devserver.wait_for_build`：允许 Agent 以编程方式构建应用并查看输出，以决定后续开发步骤。例如，构建日志可能揭示需要回头处理的代码错误，这种工作流为 Agent 实现了自愈循环。
- `devserver.start` / `devserver.stop`：用于启动和停止开发服务器，创造全新的 Agent 工作流。

本次发布中，上述工具连同测试和端到端工具一起升级为稳定版。Angular MCP 还包含 `ai_tutor`、`modernize`、`onpush_zoneless_migration` 等不断增长的工具列表，帮助你构建现代 Angular 应用。更多信息请访问 [angular.dev/ai/mcp](https://angular.dev/ai/mcp)。

### Angular Agent Skills

随着框架的演进，跟上不断增长的 API 体系对开发者和 AI 编码助手都是挑战——后者的训练数据可能未能覆盖最新的模式。为弥合这一差距，我们推出了 **Angular Agent Skills**：一种向 AI Agent 提供现代 Angular 开发即时上下文和专业知识的标准化方式。

目前提供两个面向开发者的 Skills：

- **`angular-developer`**：核心 Skill，为模型提供编写现代 Angular 应用的关键最佳实践和指南，特别覆盖了标准模型可能缺乏深度训练的前沿特性，如 Angular Aria 和 Signal Forms。该 Skill 采用渐进式披露，文件本身不足 140 行，仅在 Agent 真正需要时才拉取完整代码示例和深度参考文件。
- **`angular-new-app`**：为首次在 Agent 环境中探索 Angular 的开发者设计，引导 AI 助手配置好本地 Angular 开发环境。

这些 Skills 现已可在 Antigravity 等 AI 开发工具或任何运行 Agent 工作流的环境中使用。

### 面向贡献者的 Skills

为降低向大型框架贡献代码的门槛，我们还推出了一套 **Contributor Skills**，帮助解释开发 Angular 框架内部功能所需的心智模型，对希望提交第一个 PR 的开发者极具价值。甚至连经验丰富的团队成员也能通过阅读这些 Skills，更深入地理解框架架构。

### 实验性 WebMCP

Angular 很高兴推出对 **WebMCP** 的实验性支持。WebMCP 代表了塑造 Web 交互未来的激动人心的新机遇：它允许你创建并向 Agent 暴露结构化工具，让 AI 助手直接在浏览器内与应用交互，提供额外能力，减少对 DOM 操作的依赖。

早期实现支持为整个应用、路由、服务定义工具，还支持从动态 Signal Forms 自动生成工具。更多信息请参阅[相关文档](https://angular.dev/ai/webmcp)。

### AI 开发平台

开发者社区正在经历"构建者"的蓬勃兴起——这些人希望用软件将想法变为现实，但可能不具备传统的编程背景。为支持他们，我们与 **Google AI Studio** 和 **Gemini Canvas** 背后的团队紧密合作，确保这些构建者能够以 Angular 的坚实基础开启项目。

**在浏览器中直接原型开发**

你可以使用 Gemini 网页应用内置的编码沙箱直接在浏览器中创建完整应用。只需在提示词中指定"Angular"，生成的应用就会使用 Angular。代码生成后，你可以在浏览器中手动编辑，或继续与 AI 对话来精炼它，甚至直接要求集成 Firebase 实现后端存储等更多功能。

在 Google AI Studio 中也可以遵循类似的工作流：从配置面板中选择 Angular，然后开始提示。

将想法转化为结构化 Angular 应用的门槛从未如此之低。无论你以什么方式构建出色的应用，Angular 社区都欢迎你。

---

## API 改进

Angular 庞大的 API 体系本身已经提供了大量价值，但我们始终在努力改进它。让我们来看看 Angular v22 为开发者带来的新特性。

### 路由增强

Angular Router 是让 Angular 对全球开发者如此吸引的核心基础之一。我们很高兴为路由器带来新特性，帮助你的应用更好地满足业务需求。

**与平台 Navigation API 集成**

这一更新将路由器与浏览器原生 [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) 对齐，以更少的样板代码实现对应用内用户导航的更好控制：

- Router 现在可以自动拦截**所有**导航请求，包括 `RouterLink` 和标准 `<a>` 标签
- 利用浏览器原生的滚动行为，确保用户前进后退时精确落点，无需自定义滚动管理逻辑，且**不影响包体积**
- 直接接入浏览器原生导航生命周期，使触发全局加载指示器和在页面切换时广播精确的无障碍（a11y）公告变得更加容易

启用方式：

```typescript
bootstrapApplication(AppComponent, {
  providers: [provideRouter(appRoutes, withExperimentalPlatformNavigation())],
});
```

**路由清理的新控制项**

我们引入了两项新特性，用于更精确地控制内存管理，显式清理未使用的资源。我们正积极征集反馈，以确定这些变更是否应在未来版本中成为框架默认行为：

- **`withExperimentalAutoCleanupInjectors`**：告知 Router 在路由不再激活时自动销毁与之关联的依赖注入器，防止内存泄漏，确保空闲的路由级 Provider 和资源在用户导航离开时被正确释放。
- **`destroyDetachedRouteHandle`**：如果你使用了自定义 `RouteReuseStrategy`，历史上销毁已缓存路由需要各种变通方法（如将不透明 handle 强转为 `any` 来手动调用 `componentRef.destroy()`）。这个新的工具函数提供了一个官方的公共 API，用于干净地销毁 detached route handle 中存储的组件。

```typescript
import {
  provideRouter,
  withExperimentalAutoCleanupInjectors,
} from "@angular/router";

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withExperimentalAutoCleanupInjectors())],
};
```

---

### 全新的 @Service 装饰器

本次发布引入了一个新装饰器，旨在提升代码可读性和意图表达——`@Service`。在大多数使用场景下，用它替代 `@Injectable({ providedIn: 'root' })` 模式。当应用场景需要更深层的配置或构造函数注入时，`@Injectable` 仍然可用。我们认为这是定义应用全局单例更直观的方式。

```typescript
import { Service } from "@angular/core";

@Service()
export class BasicDataStore {
  private data: string[] = [];

  addData(item: string): void {
    this.data.push(item);
  }

  getData(): string[] {
    return [...this.data];
  }
}
```

---

### 异步依赖注入：injectAsync

有时候应用中存在体积较大的依赖，最好按需加载。Angular 一直支持组件和路由的懒加载，但服务此前无法享受同样的优化。**`injectAsync`** 的引入改变了这一切：这个新 API 支持异步依赖注入，实现代码分割，同时带来应用性能提升。

> 注意：服务必须是自动 provided 的，使用新的 `@Service` 装饰器可以自动满足这一要求。

```typescript
import { Component, injectAsync } from "@angular/core";

@Component({
  selector: "app-report",
  template: `<button (click)="export()">Export</button>`,
})
export class Report {
  private exporter = injectAsync(() => import("./report-exporter"));

  async export() {
    const exporter = await this.exporter();
    exporter.export();
  }
}
```

在这个示例中，`ReportExporter` 服务只有在第一次被使用时才会加载。依赖也可以预取：

```typescript
export class Report {
  private exporter = injectAsync(() => import("./report-exporter"), {
    prefetch: onIdle,
  });
}
```

团队很期待看到开发者如何利用这一新特性为应用带来更好的性能。详情请访问 [angular.dev 上的 injectAsync 官方文档](https://angular.dev/guide/di/inject-async)。

---

### 其他改进

本次发布还包含更多 API 相关特性：

- **TypeScript 6 支持**：与语言最前沿保持全面兼容
- **性能增强**：持续改进模板管道和运行时效率

---

## Angular 模板迎来全面升级

本次发布包含了大量旨在改善 Angular 模板编写体验的生活质量提升。

### HTML 元素注释支持

代码文档是开发者和编码 Agent 的重要工具，可以澄清代码意图，或标记正在进行中或计划中的工作。为扩展这种文档能力，我们在元素级别引入了注释支持，提供了在属性和绑定级别记录代码的新方式。

```html
<div
  // 有效的单行注释
  /* 另一种有效的注释 */
  attr1="value1"
  /*
     跨越多行的
     有效注释
  */
  attr2="value2"
>
</div>
```

通过这一改变，你现在可以在模板中对属性和绑定进行注释，提升可读性和清晰度。另外，**VS Code 的注释切换快捷键也已支持**。

---

### Host Directive 去重

Angular 现在会自动对同一元素上多次匹配的 host directive 进行去重。为确保清晰的解析顺序，如果一个指令同时通过模板和 host directive 两种方式匹配，模板中的匹配"优先"。我们还通过合并 host directive 的输入和输出 map 简化了体验。最后，为保持干净的 API，如果一个输入或输出以多个名称暴露，Angular 现在会抛出错误，防止潜在的命名冲突。

---

### 模板中的展开语法（Spread Syntax）

模板现在支持展开（spread）和剩余（rest）语法，表达能力大幅提升。此更新适用于对象字面量、数组字面量和函数调用。

以下是一个咖啡店风格应用中的示例：

```html
<section>
  <div
    [class]="{
    ...standardCupStyles,
    'cardboard-sleeve': isHotDrink
  }"
  ></div>

  <app-bakery-cart
    [pastryOrder]="[...dailyPastryBasics, 'croissant', 'muffin']"
  >
  </app-bakery-cart>

  <p>
    Total Cost: ${{ calculateBill(...baseItemPrices, salesTax,
    espressoShotPrice) }}
  </p>
</section>
```

---

### @switch 更强大，样板更少

`@switch` 语句现在支持多 case 匹配，开发者可以享受更简洁的模板，减少不必要的代码重复。在下面的示例中，两个 case 可以共享同一输出：

```html
<section>
  @switch (orderStatus) { @case ('Pending') @case ('Processing') {
  <p class="badge-blue">In progress</p>
  } @case ('Shipped') {
  <p class="badge-green">On its way!</p>
  } @default {
  <p class="badge-gray">Unknown</p>
  } }
</section>
```

`@switch` 语法还迎来了另一个实用更新：**`@switch` 块的穷举检查（Exhaustive checks）**。对于使用联合类型的开发者，如果有任何可能的值未被处理，现在会在编译期收到错误。在 `@default` 中使用 `never` 值来启用此检查：

```html
<section>
  @switch (orderStatus) { @case ('Pending') @case ('Processing') {
  <p class="badge-blue">In Progress</p>
  } @case ('Shipped') {
  <p class="badge-green">Shipped</p>
  } @default never; }
</section>
```

---

### 模板中的箭头函数

很多开发者一直希望在模板中内联简单函数，但此前的模板语法限制了直接在模板中编写函数的能力。在最新版本的 Angular 中，**内联函数在模板中合法了**——但需注意几点：

- 内联模板中请使用箭头函数
- 保持函数简短简单——复杂函数不应写在模板中

```html
<p>Stock: {{ item().stock }}</p>
<button (click)="item.update(p => ({ ...p, stock: p.stock - 1 }))">
  Decrease Stock
</button>
```

只要函数不是长时间运行的，在模板中调用函数是完全没问题的。

---

## 变更检测的两项重要变化

我们对开发者在组件中指定变更检测细节的方式进行了两项重要调整。

**第一，OnPush 现在是新应用的默认策略。** 这一调整让新应用与 Zoneless 作为默认的理念保持一致，也契合 Angular"默认高性能"的目标。既然已是默认，组件中也不再需要显式指定 `OnPush`。

```typescript
// 这个组件默认使用 OnPush
@Component({
  selector: "app-weather",
  template: `<section>Loading Weather...</section>`,
})
export class WeatherComponent {}
```

**第二，原来的默认策略 `ChangeDetectionStrategy.Default` 更名为 `ChangeDetectionStrategy.Eager`。** 这一重命名帮助遇到它的开发者更清晰地理解它的行为及其对变更检测周期的影响。

```typescript
@Component({
  selector: "app-weather",
  template: `<section>Loading Weather...</section>`,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class WeatherComponent {}
```

---

## 抢先看：@boundary 错误边界

让我们转换话题，聊聊每个人都关心的话题：**模板错误**。模板错误令开发者沮丧，也令用户苦恼。开发者努力在组件代码中编写防御性模式，而用户可能面对一个破损的页面。如果崩溃发生在高风险流程中（如电商结账），一个损坏的组件就能彻底破坏用户体验、流失客户，并直接影响营收。

Angular 正在引入一个急需的解决方案：**`@boundary`**——一个在 Angular 模板中直接实现错误边界的全新 API。

```html
<section>
  <!-- 从 promotional widget 冒泡的错误将被捕获 -->
  @boundary {
  <app-promotional-widget />
  } @error (let err) {
  <!-- 降级内容 -->
  <app-default-promo-widget />
  }

  <app-cart-summary />
  <app-checkout-flow />
</section>
```

通过将关键或不确定的代码块包裹在新的 `@boundary` 语法中，一个孤立的组件故障将不再拖垮整个页面。错误被捕获，开发者可以指定降级内容。这对开发者和用户体验都是重大的胜利。

**`@boundary` 将作为开发者预览版在 2026 年第三季度发布。**

---

## 关于废弃项的说明

v22 中废弃了 Webpack 支持，包括 `@angular-devkit/build-angular` 构建器、`@ngtools/webpack` 等。我们正专注于应用构建器中的 TSGo 支持，后续更新将分享更多细节。

更多关于本次发布废弃项的信息，请查阅 [Angular CHANGELOG](https://github.com/angular/angular/blob/main/CHANGELOG.md)。

---

## 面向未来的坚实基础

Angular v22 不仅仅是特性的集合，更是对你所依赖的稳定性和你所值得期待的创新的承诺。我们迫不及待地想看到你在这一基础上构建出什么。

快去构建出色的应用吧。
