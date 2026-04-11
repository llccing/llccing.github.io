---
pubDatetime: 2026-04-11T20:10:00+08:00
title: Angular 升级指南（二）：Angular 16-18 新特性详解
slug: angular-features-16-to-18
featured: false
draft: false
tags: ["angular"]
description: Angular 16-18 是框架的变革期——Signals 响应式系统诞生、新控制流语法、@defer 延迟加载、esbuild 构建器、SSR 水合等重磅特性逐步落地。
---

> 本文是 Angular 升级系列教程的第二篇，覆盖 Angular 16、17、18 三个版本。系列文章：
> - [（一）Angular 13-15 新特性详解](/posts/angular-features-13-to-15)
> - **（二）Angular 16-18 新特性详解**（本文）
> - [（三）Angular 19-21 新特性详解](/posts/angular-features-19-to-21)

---

## Angular 16（2023年5月）

Angular 16 是一个划时代的版本——**Signals 响应式系统**的诞生。

### 1. Signals 响应式原语（开发者预览版）🧪 ⭐

Signals 是 Angular 全新的细粒度响应式系统，目标是最终取代 Zone.js：

```typescript
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <h2>计数: {{ count() }}</h2>
    <p>双倍: {{ doubleCount() }}</p>
    <button (click)="increment()">+1</button>
    <button (click)="decrement()">-1</button>
    <button (click)="reset()">重置</button>
  `
})
export class CounterComponent {
  // signal — 可变的响应式值
  count = signal(0);

  // computed — 派生值，自动追踪依赖
  doubleCount = computed(() => this.count() * 2);

  constructor() {
    // effect — 副作用，依赖变化时自动重新执行
    effect(() => {
      console.log(`当前计数: ${this.count()}`);
    });
  }

  increment() {
    // update — 基于当前值更新
    this.count.update(v => v + 1);
  }

  decrement() {
    this.count.update(v => v - 1);
  }

  reset() {
    // set — 直接设置值
    this.count.set(0);
  }
}
```

Signal 的核心 API：

```typescript
// 创建
const name = signal('Angular');       // WritableSignal<string>
const version = signal(16);           // WritableSignal<number>
const config = signal({ theme: 'dark' }); // WritableSignal<object>

// 读取 — 调用信号函数
console.log(name());  // 'Angular'

// 写入
name.set('Angular 16');
version.update(v => v + 1);

// mutate（用于对象/数组的就地修改，后续版本已移除，改用 update）
config.update(c => ({ ...c, theme: 'light' }));

// computed — 只读派生信号
const greeting = computed(() => `Hello ${name()} v${version()}`);

// effect — 副作用
effect(() => {
  document.title = `${name()} v${version()}`;
});
```

### 2. RxJS 与 Signals 互操作

`@angular/core/rxjs-interop` 提供了 RxJS 和 Signals 之间的桥梁：

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-interop',
  template: `
    <p>时间: {{ timer() }}</p>
    <p>搜索词: {{ searchTerm() }}</p>
  `
})
export class InteropComponent {
  // Observable → Signal
  timer = toSignal(
    interval(1000).pipe(map(n => `${n}秒`)),
    { initialValue: '0秒' }
  );

  // Signal → Observable
  searchTerm = signal('');
  searchTerm$ = toObservable(this.searchTerm);

  constructor() {
    // 可以用 RxJS 操作符处理信号变化
    this.searchTerm$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => this.searchService.search(term))
    ).subscribe(results => {
      this.results.set(results);
    });
  }

  results = signal<SearchResult[]>([]);
}
```

### 3. 非破坏性 SSR 水合（开发者预览版）🧪

Angular 16 引入了非破坏性水合——服务端渲染的 DOM 不再被销毁重建：

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideClientHydration } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration() // 启用非破坏性水合
  ]
});
```

之前 Angular SSR 的流程是：服务端渲染 → 客户端销毁 DOM → 重新渲染。现在变为：服务端渲染 → 客户端复用现有 DOM → 附加事件监听器。

### 4. Required Inputs（必填输入）

组件输入可以标记为必填：

```typescript
@Component({
  selector: 'app-user-card',
  template: '<h2>{{ name }}</h2>'
})
export class UserCardComponent {
  @Input({ required: true }) name!: string; // 必填
  @Input() age?: number; // 可选
}

// 使用时如果不传 name，编译器会报错
// <app-user-card /> ❌ Error: Required input 'name' is missing
// <app-user-card name="张三" /> ✅
```

### 5. 路由参数绑定到组件 Input

路由参数可以自动绑定到组件的 `@Input()`：

```typescript
// app.config.ts
provideRouter(routes, withComponentInputBinding())

// 路由配置
const routes: Routes = [
  { path: 'user/:id', component: UserComponent }
];

// 组件 — 自动接收路由参数
@Component({
  selector: 'app-user',
  template: '<h1>用户 ID: {{ id }}</h1>'
})
export class UserComponent {
  @Input() id!: string; // 自动从路由参数 :id 绑定

  // 也支持 query params 和 data
  @Input() tab?: string;  // ?tab=profile → this.tab = 'profile'
}
```

### 6. Self-closing Tags（自闭合标签）

组件可以使用自闭合标签：

```html
<!-- ❌ 之前 -->
<app-icon name="home"></app-icon>
<app-divider></app-divider>

<!-- ✅ Angular 16+ -->
<app-icon name="home" />
<app-divider />
```

### 7. esbuild 开发服务器（开发者预览版）

基于 esbuild + Vite 的新开发服务器，构建速度大幅提升：

```json
// angular.json — 试用新构建器
{
  "architect": {
    "build": {
      "builder": "@angular-devkit/build-angular:browser-esbuild"
    }
  }
}
```

### 8. 其他变更

- 支持 TypeScript 4.9 - 5.0
- 支持 Node.js 16 和 18
- `ngOnDestroy` 可通过 `DestroyRef` 注入
- Jest 和 Web Test Runner 实验性支持
- CSP（内容安全策略）支持 nonce

**升级命令：**

```bash
ng update @angular/core@16 @angular/cli@16
```

---

## Angular 17（2023年11月）

Angular 17 是一次**品牌重塑**——新 Logo、新文档站（angular.dev）、新构建系统默认化。

### 1. 新的模板控制流语法（开发者预览版）⭐

用 `@if`、`@for`、`@switch` 替代 `*ngIf`、`*ngFor`、`*ngSwitch`：

```typescript
@Component({
  selector: 'app-product-list',
  template: `
    <!-- @if / @else if / @else -->
    @if (products().length > 0) {
      <h2>商品列表（{{ products().length }}件）</h2>
    } @else if (isLoading()) {
      <p>加载中...</p>
    } @else {
      <p>暂无商品</p>
    }

    <!-- @for — 必须提供 track -->
    @for (product of products(); track product.id) {
      <div class="product-card">
        <h3>{{ product.name }}</h3>
        <p>¥{{ product.price }}</p>
        <span>第 {{ $index + 1 }} 件，共 {{ $count }} 件</span>
        @if ($first) { <span class="badge">首件</span> }
        @if ($last) { <span class="badge">末件</span> }
        @if ($even) { <span>偶数行</span> }
      </div>
    } @empty {
      <p>没有找到商品</p>
    }

    <!-- @switch -->
    @switch (status()) {
      @case ('active') {
        <span class="badge green">活跃</span>
      }
      @case ('inactive') {
        <span class="badge gray">未激活</span>
      }
      @case ('banned') {
        <span class="badge red">已封禁</span>
      }
      @default {
        <span class="badge">未知</span>
      }
    }
  `
})
export class ProductListComponent {
  products = signal<Product[]>([]);
  isLoading = signal(false);
  status = signal('active');
}
```

**`@for` 中可用的隐式变量：**

| 变量 | 类型 | 说明 |
|------|------|------|
| `$index` | number | 当前索引 |
| `$first` | boolean | 是否第一个 |
| `$last` | boolean | 是否最后一个 |
| `$even` | boolean | 是否偶数索引 |
| `$odd` | boolean | 是否奇数索引 |
| `$count` | number | 总数量 |

**自动迁移命令：**

```bash
# 自动将 *ngIf, *ngFor, *ngSwitch 迁移到新语法
ng generate @angular/core:control-flow
```

### 2. Deferrable Views（`@defer` 延迟视图）🧪 ⭐

`@defer` 让组件可以懒加载——只在需要时才加载代码和渲染：

```typescript
@Component({
  selector: 'app-dashboard',
  template: `
    <h1>仪表盘</h1>

    <!-- 基本用法：进入视口时加载 -->
    @defer (on viewport) {
      <app-heavy-chart />
    } @placeholder {
      <div class="skeleton" style="height: 300px;">图表区域</div>
    } @loading (minimum 500ms) {
      <div class="spinner">加载图表中...</div>
    } @error {
      <p>图表加载失败</p>
    }

    <!-- 用户交互时加载 -->
    @defer (on interaction) {
      <app-comment-section />
    } @placeholder {
      <div class="placeholder">点击加载评论区</div>
    }

    <!-- 浏览器空闲时加载 -->
    @defer (on idle) {
      <app-recommendations />
    } @placeholder {
      <p>推荐内容</p>
    }

    <!-- 定时加载 -->
    @defer (on timer(3s)) {
      <app-ads />
    } @placeholder {
      <div>广告位</div>
    }

    <!-- 鼠标悬停时加载 -->
    @defer (on hover) {
      <app-tooltip-content />
    } @placeholder {
      <span>悬停查看详情</span>
    }

    <!-- 条件触发 -->
    @defer (when showAdvanced()) {
      <app-advanced-settings />
    } @placeholder {
      <button (click)="showAdvanced.set(true)">显示高级设置</button>
    }

    <!-- 预获取：提前下载代码但不渲染 -->
    @defer (on interaction; prefetch on idle) {
      <app-modal />
    } @placeholder {
      <button>打开弹窗</button>
    }
  `
})
export class DashboardComponent {
  showAdvanced = signal(false);
}
```

`@defer` 的触发条件汇总：

| 触发条件 | 说明 |
|---------|------|
| `on idle` | 浏览器空闲时 |
| `on viewport` | 进入视口时 |
| `on interaction` | 用户交互（点击、聚焦）时 |
| `on hover` | 鼠标悬停时 |
| `on immediate` | 立即加载（但仍然是懒加载的 chunk）|
| `on timer(Xs)` | X 秒后加载 |
| `when condition` | 条件为 true 时 |

### 3. esbuild + Vite 成为新项目的默认构建系统

Angular 17 新项目默认使用基于 esbuild 的 `application` 构建器：

```json
// angular.json — 新项目默认配置
{
  "architect": {
    "build": {
      "builder": "@angular-devkit/build-angular:application",
      "options": {
        "outputPath": "dist/my-app",
        "index": "src/index.html",
        "browser": "src/main.ts",  // 注意：不再是 "main"
        "tsConfig": "tsconfig.app.json"
      }
    }
  }
}
```

对比旧构建器的性能提升：
- 构建速度提升 67%+
- `ng serve` 热更新几乎瞬时
- 包体积略有减小

**从旧构建器迁移：**

```bash
# 自动迁移
ng update @angular/cli@17 --force

# 手动切换 angular.json
# "builder": "@angular-devkit/build-angular:browser"
# →
# "builder": "@angular-devkit/build-angular:application"
# 同时将 "main" 改为 "browser"
```

### 4. Standalone 成为默认

Angular 17 中 `ng new` 创建的项目默认没有 `AppModule`，所有 `ng generate` 命令默认生成 standalone 组件：

```bash
# 新建项目 — 默认 standalone
ng new my-app

# 生成组件 — 默认 standalone: true
ng generate component user-card
# 生成指令/管道 — 同样默认 standalone
ng generate directive highlight
ng generate pipe currency-format
```

### 5. 新文档站 angular.dev

Angular 团队发布了全新的文档网站 [angular.dev](https://angular.dev)，包含：
- 交互式教程
- 全新的 API 文档
- 内置 Playground

### 6. Signal Inputs / Outputs / Queries（开发者预览版）🧪

信号版的 Input/Output/ViewChild 等 API 开始预览：

```typescript
import { Component, input, output, model } from '@angular/core';

@Component({
  selector: 'app-slider',
  template: `
    <input type="range"
      [value]="value()"
      [min]="min()"
      [max]="max()"
      (input)="onInput($event)" />
    <span>{{ value() }}</span>
  `
})
export class SliderComponent {
  // signal input
  min = input(0);
  max = input(100);
  value = model(50);  // 双向绑定的 signal

  // signal output
  valueChange = output<number>();

  onInput(event: Event) {
    const val = +(event.target as HTMLInputElement).value;
    this.value.set(val);
    this.valueChange.emit(val);
  }
}

// 父组件使用
// <app-slider [(value)]="sliderValue" [min]="0" [max]="200" />
```

### 7. SSR 水合稳定 + 新 SSR 特性

非破坏性水合在 Angular 17 中正式稳定：

```typescript
bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(),  // 正式稳定 ✅
  ]
});
```

新的 `@angular/ssr` 包替代了 `@nguniversal`：

```bash
# 添加 SSR 支持
ng add @angular/ssr
```

### 8. 其他变更

- 支持 TypeScript 5.2
- 需要 Node.js 18.13+
- 新 Logo 和品牌设计
- `afterRender` 和 `afterNextRender` 生命周期钩子
- View Transitions API 支持
- 调试工具改进

**升级命令：**

```bash
ng update @angular/core@17 @angular/cli@17

# 迁移到新控制流（可选但推荐）
ng generate @angular/core:control-flow
```

---

## Angular 18（2024年5月）

### 1. 新控制流语法正式稳定 ✅

`@if`、`@for`、`@switch`、`@defer` 全部升级为稳定版：

```typescript
// 这些语法不再是开发者预览版，可以放心在生产环境使用
@Component({
  template: `
    @if (user(); as u) {
      <h1>欢迎，{{ u.name }}！</h1>
      @for (role of u.roles; track role) {
        <span class="role-badge">{{ role }}</span>
      }
    }

    @defer (on viewport) {
      <app-activity-feed [userId]="user()?.id" />
    } @placeholder {
      <div class="skeleton">活动记录</div>
    }
  `
})
export class HomeComponent {
  user = signal<User | null>(null);
}
```

### 2. Zoneless 变更检测（实验性）🧪 ⭐

Angular 18 引入了实验性的无 Zone.js 变更检测——这是 Angular 性能的未来：

```typescript
// main.ts — 启用 Zoneless
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
});

// 使用 Zoneless 后，变更检测完全由 Signals 驱动
@Component({
  selector: 'app-todo',
  template: `
    <input #input />
    <button (click)="addTodo(input.value)">添加</button>

    @for (todo of todos(); track todo.id) {
      <div>
        <input type="checkbox"
          [checked]="todo.done"
          (change)="toggleTodo(todo.id)" />
        {{ todo.text }}
      </div>
    }
  `
})
export class TodoComponent {
  todos = signal<Todo[]>([]);

  addTodo(text: string) {
    this.todos.update(list => [...list, {
      id: Date.now(), text, done: false
    }]);
  }

  toggleTodo(id: number) {
    this.todos.update(list =>
      list.map(t => t.id === id ? { ...t, done: !t.done } : t)
    );
  }
}
```

去掉 Zone.js 的好处：
- 减少约 13KB（gzipped）的包体积
- 不再有不必要的变更检测循环
- 更好的性能和可预测的行为
- 更好的调试体验

### 3. Signal Inputs / Outputs / Model / Queries 稳定

Angular 18 将大部分信号 API 标记为稳定或接近稳定：

```typescript
import { Component, input, output, model, viewChild, viewChildren } from '@angular/core';

@Component({
  selector: 'app-accordion',
  template: `
    <div class="accordion">
      <button #toggleBtn (click)="toggle()">
        {{ title() }} {{ isOpen() ? '▼' : '▶' }}
      </button>
      @if (isOpen()) {
        <div class="content" #content>
          <ng-content />
        </div>
      }
    </div>
  `
})
export class AccordionComponent {
  // 稳定的 signal input
  title = input.required<string>();
  initialOpen = input(false);

  // model — 支持双向绑定的信号
  isOpen = model(false);

  // signal output
  toggled = output<boolean>();

  // signal queries
  toggleBtn = viewChild.required<ElementRef>('toggleBtn');
  contentSections = viewChildren<ElementRef>('content');

  constructor() {
    // 用 effect 响应 input 变化
    effect(() => {
      if (this.initialOpen()) {
        this.isOpen.set(true);
      }
    });
  }

  toggle() {
    this.isOpen.update(v => !v);
    this.toggled.emit(this.isOpen());
  }
}
```

### 4. Hydration 稳定 + 事件回放

SSR 水合正式稳定，新增事件回放功能（开发者预览版）：

```typescript
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(
      withEventReplay() // 回放水合前用户的交互事件
    )
  ]
});
```

事件回放的意义：用户在页面水合完成之前点击了按钮，这些事件会被记录下来，水合完成后自动回放执行。

### 5. Material 3 正式稳定

Angular Material 全面支持 Material Design 3：

```typescript
// 使用 Material 3 主题
@use '@angular/material' as mat;

$theme: mat.define-theme((
  color: (
    theme-type: light,
    primary: mat.$azure-palette,
    tertiary: mat.$blue-palette,
  ),
  typography: (
    brand-family: 'Roboto',
    plain-family: 'Roboto Mono',
  ),
  density: (
    scale: 0,
  ),
));

:root {
  @include mat.all-component-themes($theme);
}
```

### 6. Forms 改进

新的 `FormRecord` 和表单事件统一：

```typescript
// FormRecord — 动态表单字段
const permissions = new FormRecord<FormControl<boolean>>({});

// 动态添加字段
permissions.addControl('read', new FormControl(true));
permissions.addControl('write', new FormControl(false));
permissions.addControl('admin', new FormControl(false));

// 统一的表单事件 — events 属性
const nameControl = new FormControl('');
nameControl.events.subscribe(event => {
  if (event instanceof TouchedChangeEvent) {
    console.log('touched 状态变化:', event.touched);
  }
  if (event instanceof PristineChangeEvent) {
    console.log('pristine 状态变化:', event.pristine);
  }
  if (event instanceof StatusChangeEvent) {
    console.log('验证状态变化:', event.status);
  }
  if (event instanceof ValueChangeEvent) {
    console.log('值变化:', event.value);
  }
});
```

### 7. 路由 `redirectCommand`

新的路由重定向方式，支持更复杂的重定向逻辑：

```typescript
const routes: Routes = [
  {
    path: 'old-page',
    redirectTo: ({ queryParams }) => {
      const id = queryParams['id'];
      if (id) {
        return `/new-page/${id}`;
      }
      return '/new-page';
    }
  }
];
```

### 8. 其他变更

- 支持 TypeScript 5.4
- 需要 Node.js 18.19+
- `fallback` 内容支持（`ng-content` 默认内容）
- `@angular/fire` 更新
- 调试工具中的水合信息
- 性能分析工具改进

```typescript
// ng-content fallback
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <ng-content select="[header]">
        <h3>默认标题</h3>  <!-- 没有传入 header 时的默认内容 -->
      </ng-content>
      <ng-content>
        <p>暂无内容</p>    <!-- 没有传入内容时的默认文本 -->
      </ng-content>
    </div>
  `
})
export class CardComponent {}
```

**升级命令：**

```bash
ng update @angular/core@18 @angular/cli@18
```

---

## 版本升级路径总结

| 版本 | TypeScript | Node.js | 关键里程碑 |
|------|-----------|---------|-----------|
| 16 | 4.9 - 5.0 | 16.14+ / 18.10+ | **Signals 诞生**（开发者预览版）|
| 17 | 5.2 | 18.13+ | 新控制流 + @defer + esbuild 默认 |
| 18 | 5.4 | 18.19+ | 控制流稳定 + Zoneless 实验 + Material 3 |

### Signals 特性状态演进

| 特性 | Angular 16 | Angular 17 | Angular 18 |
|------|-----------|-----------|-----------|
| signal / computed / effect | 🧪 预览 | ✅ 稳定 | ✅ 稳定 |
| signal input() | — | 🧪 预览 | ✅ 稳定 |
| signal output() | — | 🧪 预览 | ✅ 稳定 |
| signal model() | — | 🧪 预览 | ✅ 稳定 |
| viewChild / viewChildren | — | 🧪 预览 | ✅ 稳定 |
| Zoneless | — | — | 🧪 实验 |

```bash
# 逐版本升级（推荐）
ng update @angular/core@16 @angular/cli@16
ng update @angular/core@17 @angular/cli@17
ng update @angular/core@18 @angular/cli@18

# Angular 17 迁移到新控制流
ng generate @angular/core:control-flow
```

> 下一篇：[Angular 升级指南（三）：Angular 19-21 新特性详解](/posts/angular-features-19-to-21)
