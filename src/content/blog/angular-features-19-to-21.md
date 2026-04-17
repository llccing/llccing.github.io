---
pubDatetime: 2026-04-17T12:00:00+08:00
title: Angular 升级指南（三）：Angular 19-22 新特性详解
slug: angular-features-19-to-21
featured: false
draft: false
tags: ["angular"]
description: Angular 19-22 标志着框架的成熟期--Signals 全面稳定、Zoneless 正式落地、Signal Forms、Angular Aria 无障碍组件、默认 OnPush 等特性让 Angular 焕然一新。
---

> 本文是 Angular 升级系列教程的第三篇，覆盖 Angular 19、20、21、22 四个版本。系列文章：
> - [（一）Angular 13-15 新特性详解](/posts/angular-features-13-to-15)
> - [（二）Angular 16-18 新特性详解](/posts/angular-features-16-to-18)
> - **（三）Angular 19-22 新特性详解**（本文）

---

## Angular 19（2024年11月）

Angular 19 是 Signals 响应式系统的**收官之作**--几乎所有核心 Signal API 都在这个版本正式稳定。

### 1. Signals 核心 API 全面稳定 ✅

`signal`、`computed`、`effect`、`input`、`output`、`model`、`viewChild`、`viewChildren`、`contentChild`、`contentChildren` 全部标记为稳定版：

```typescript
import {
  Component, signal, computed, effect,
  input, output, model,
  viewChild, viewChildren, contentChild, contentChildren
} from '@angular/core';

@Component({
  selector: 'app-task-board',
  template: `
    <h2>{{ title() }} ({{ activeCount() }}/{{ tasks().length }})</h2>

    <input #newTask />
    <button (click)="addTask(newTask.value); newTask.value = ''">添加</button>

    @for (task of tasks(); track task.id) {
      <div class="task" [class.done]="task.done">
        <input type="checkbox"
          [checked]="task.done"
          (change)="toggleTask(task.id)" />
        <span>{{ task.text }}</span>
      </div>
    } @empty {
      <p>暂无任务，添加一个吧！</p>
    }

    <div #footer>
      <ng-content />
    </div>
  `
})
export class TaskBoardComponent {
  // signal input - 稳定 ✅
  title = input('任务看板');

  // model - 双向绑定信号，稳定 ✅
  tasks = model<Task[]>([]);

  // computed - 稳定 ✅
  activeCount = computed(() =>
    this.tasks().filter(t => !t.done).length
  );

  // output - 稳定 ✅
  taskAdded = output<Task>();
  taskToggled = output<number>();

  // viewChild - 稳定 ✅
  footer = viewChild<ElementRef>('footer');

  constructor() {
    // effect - 稳定 ✅
    effect(() => {
      console.log(`活跃任务: ${this.activeCount()}`);
    });
  }

  addTask(text: string) {
    if (!text.trim()) return;
    const task = { id: Date.now(), text, done: false };
    this.tasks.update(list => [...list, task]);
    this.taskAdded.emit(task);
  }

  toggleTask(id: number) {
    this.tasks.update(list =>
      list.map(t => t.id === id ? { ...t, done: !t.done } : t)
    );
    this.taskToggled.emit(id);
  }
}
```

### 2. `resource()` API（开发者预览版）🧪 ⭐

全新的异步数据获取原语，与 Signals 深度集成，替代手动管理 loading/error 状态：

```typescript
import { Component, signal, resource } from '@angular/core';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
}

@Component({
  selector: 'app-user-profile',
  template: `
    <div class="profile">
      @if (userResource.isLoading()) {
        <div class="skeleton">加载中...</div>
      }

      @if (userResource.value(); as user) {
        <img [src]="user.avatar" [alt]="user.name" />
        <h2>{{ user.name }}</h2>
        <p>{{ user.email }}</p>
      }

      @if (userResource.error(); as err) {
        <div class="error">
          <p>加载失败: {{ err }}</p>
          <button (click)="userResource.reload()">重试</button>
        </div>
      }

      <div class="nav">
        <button (click)="userId.update(v => v - 1)"
                [disabled]="userId() <= 1">上一个</button>
        <span>用户 #{{ userId() }}</span>
        <button (click)="userId.update(v => v + 1)">下一个</button>
      </div>
    </div>
  `
})
export class UserProfileComponent {
  userId = signal(1);

  // resource - 响应式数据获取
  userResource = resource({
    // request: 定义依赖的信号
    // 当 userId 变化时，自动取消上一次请求并重新获取
    request: () => ({ id: this.userId() }),

    // loader: 异步加载函数
    loader: async ({ request, abortSignal }) => {
      const res = await fetch(
        `https://api.example.com/users/${request.id}`,
        { signal: abortSignal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as User;
    }
  });
}
```

`resource` 的状态属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| `value()` | `T \| undefined` | 加载成功的数据 |
| `error()` | `unknown` | 错误信息 |
| `isLoading()` | `boolean` | 是否正在加载 |
| `status()` | `ResourceStatus` | 状态枚举：idle / loading / resolved / error |
| `reload()` | `void` | 手动重新加载 |

### 3. `linkedSignal`（开发者预览版）🧪

创建一个可写信号，当源信号变化时自动重置为计算值：

```typescript
import { Component, signal, computed, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-product-filter',
  template: `
    <h2>商品筛选</h2>

    <!-- 分类选择 -->
    <select [value]="category()" (change)="category.set($any($event.target).value)">
      @for (cat of categories; track cat.value) {
        <option [value]="cat.value">{{ cat.label }}</option>
      }
    </select>

    <!-- 排序方式 - 切换分类时自动重置为默认排序 -->
    <select [value]="sortBy()" (change)="sortBy.set($any($event.target).value)">
      <option value="price">价格</option>
      <option value="name">名称</option>
      <option value="rating">评分</option>
      <option value="sales">销量</option>
    </select>

    <!-- 当前页码 - 切换分类或排序时自动重置为第1页 -->
    <div class="pagination">
      <button (click)="page.update(p => p - 1)" [disabled]="page() <= 1">上一页</button>
      <span>第 {{ page() }} 页</span>
      <button (click)="page.update(p => p + 1)">下一页</button>
    </div>

    <p>分类: {{ category() }} | 排序: {{ sortBy() }} | 页码: {{ page() }}</p>
  `
})
export class ProductFilterComponent {
  categories = [
    { value: 'electronics', label: '电子产品' },
    { value: 'books', label: '图书' },
    { value: 'clothing', label: '服装' },
  ];

  // 源信号
  category = signal('electronics');

  // linkedSignal: 分类变化时，排序重置为 'price'
  sortBy = linkedSignal({
    source: this.category,
    computation: () => 'price'
  });

  // linkedSignal: 分类或排序变化时，页码重置为 1
  page = linkedSignal({
    source: () => ({ cat: this.category(), sort: this.sortBy() }),
    computation: () => 1
  });
}
```

`linkedSignal` vs `computed` 的区别：

```typescript
// computed - 只读，完全由依赖决定
const fullName = computed(() => `${firstName()} ${lastName()}`);
// fullName 不能手动修改

// linkedSignal - 可写，但源变化时会重置
const selectedCity = linkedSignal({
  source: country,
  computation: (country) => getDefaultCity(country)
});
// selectedCity 可以手动 set/update
// 但当 country 变化时，会自动重置为默认城市
```

### 4. Standalone 默认为 true

Angular 19 中 `standalone: true` 成为所有组件、指令、管道的默认值：

```typescript
// Angular 19 - 不需要写 standalone: true
@Component({
  selector: 'app-hello',
  imports: [CommonModule],
  template: '<h1>Hello</h1>'
})
export class HelloComponent {}

// 等价于之前的
@Component({
  standalone: true,  // 不再需要
  selector: 'app-hello',
  imports: [CommonModule],
  template: '<h1>Hello</h1>'
})
export class HelloComponent {}

// 如果需要非独立组件，必须显式声明
@Component({
  standalone: false,  // 显式声明
  selector: 'app-legacy',
  template: '<h1>Legacy</h1>'
})
export class LegacyComponent {}
```

### 5. 路由级渲染模式（Route-level Render Mode）

可以在路由配置中为每个路由指定渲染策略：

```typescript
import { Routes } from '@angular/router';
import { RenderMode } from '@angular/ssr';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    data: { renderMode: RenderMode.Server }  // SSR
  },
  {
    path: 'about',
    component: AboutComponent,
    data: { renderMode: RenderMode.Prerender }  // SSG（静态生成）
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    data: { renderMode: RenderMode.Client }  // 纯 CSR
  },
  {
    path: 'blog/:slug',
    component: BlogPostComponent,
    data: { renderMode: RenderMode.Prerender },
    resolve: {
      // 动态路由的预渲染参数
      renderParams: async () => {
        const slugs = await getAllBlogSlugs();
        return slugs.map(slug => ({ slug }));
      }
    }
  }
];
```

### 6. 增量水合（Incremental Hydration）开发者预览版 🧪

结合 `@defer` 实现按需水合，大幅减少首屏 JavaScript 执行量：

```typescript
@Component({
  selector: 'app-page',
  template: `
    <header>页面头部 - 立即水合</header>

    <!-- 进入视口时才水合 -->
    @defer (hydrate on viewport) {
      <app-heavy-chart />
    } @placeholder {
      <div class="skeleton">图表区域</div>
    }

    <!-- 用户交互时才水合 -->
    @defer (hydrate on interaction) {
      <app-comments />
    } @placeholder {
      <div>评论区（点击激活）</div>
    }

    <!-- 浏览器空闲时水合 -->
    @defer (hydrate on idle) {
      <app-recommendations />
    }

    <!-- 永不水合 - 纯静态内容 -->
    @defer (hydrate never) {
      <app-static-footer />
    }

    <!-- 鼠标悬停时水合 -->
    @defer (hydrate on hover) {
      <app-preview-card />
    }

    <!-- 定时水合 -->
    @defer (hydrate on timer(5s)) {
      <app-analytics />
    }
  `
})
export class PageComponent {}
```

### 7. HMR 默认开启

开发服务器默认启用 Hot Module Replacement，样式和模板修改即时生效：

```bash
# 默认开启 HMR
ng serve

# 禁用
ng serve --no-hmr
```

### 8. 其他变更

- 支持 TypeScript 5.5 - 5.6
- 需要 Node.js 18.19+
- `effect()` 默认在组件销毁时自动清理
- `afterRender` / `afterNextRender` 新的 phase API
- 改进的 SSR 日志和调试信息
- Angular DevTools 更新

**升级命令：**

```bash
ng update @angular/core@19 @angular/cli@19
```

---

## Angular 20（2025年5月）

Angular 20 是**Zoneless 时代的开端**--无 Zone.js 变更检测正式稳定。

### 1. Zoneless 变更检测正式稳定 ✅ ⭐

这是 Angular 历史上最重要的性能里程碑之一：

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
// 注意：不再有 "Experimental" 前缀

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection()  // 正式稳定 ✅
  ]
});
```

Zoneless 的影响：
- 新项目默认不再包含 `zone.js`
- 包体积减少约 13KB（gzipped）
- 变更检测完全由 Signals 驱动，更精确、更高效
- 不再有 `NgZone.run()` 的心智负担
- 第三方库的 `setTimeout`/`Promise` 不再触发不必要的变更检测

```typescript
// Zoneless 下的最佳实践 - 全面使用 Signals
@Component({
  selector: 'app-search',
  template: `
    <input [value]="query()" (input)="query.set($any($event.target).value)" />

    @if (results.isLoading()) {
      <div class="spinner">搜索中...</div>
    }

    @if (results.value(); as items) {
      @for (item of items; track item.id) {
        <div class="result">{{ item.title }}</div>
      } @empty {
        <p>未找到结果</p>
      }
    }
  `
})
export class SearchComponent {
  query = signal('');

  results = resource({
    request: () => this.query(),
    loader: async ({ request: q, abortSignal }) => {
      if (!q) return [];
      const res = await fetch(`/api/search?q=${q}`, { signal: abortSignal });
      return res.json();
    }
  });
}
```

### 2. `httpResource` API（开发者预览版）🧪 ⭐

基于 `HttpClient` 的响应式数据获取，是 `resource()` 的 HTTP 专用版本：

```typescript
import { Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

@Component({
  selector: 'app-todos',
  template: `
    <h2>待办事项</h2>

    @if (todosResource.isLoading()) {
      <div class="spinner">加载中...</div>
    }

    @if (todosResource.hasValue()) {
      @for (todo of todosResource.value()!; track todo.id) {
        <div [class.completed]="todo.completed">
          <input type="checkbox" [checked]="todo.completed" />
          {{ todo.title }}
        </div>
      }
    }

    @if (todosResource.error(); as err) {
      <div class="error">错误: {{ err }}</div>
    }

    <button (click)="userId.set(userId() + 1)">切换用户</button>
    <button (click)="todosResource.reload()">刷新</button>
  `
})
export class TodosComponent {
  userId = signal(1);

  // httpResource - 自动跟踪信号依赖
  todosResource = httpResource<Todo[]>({
    url: () => `https://jsonplaceholder.typicode.com/todos?userId=${this.userId()}`
  });
}
```

`httpResource` vs `resource` 的区别：

```typescript
// resource - 通用异步加载，使用 fetch 或任意异步操作
const data = resource({
  request: () => ({ id: this.id() }),
  loader: async ({ request, abortSignal }) => {
    const res = await fetch(`/api/${request.id}`, { signal: abortSignal });
    return res.json();
  }
});

// httpResource - 专为 HTTP 设计，自动使用 HttpClient
// 支持拦截器、类型安全、请求配置
const data = httpResource<MyType>({
  url: () => `/api/${this.id()}`,
  method: 'GET',
  headers: () => ({ 'Authorization': `Bearer ${this.token()}` }),
  params: () => ({ page: this.page().toString() }),
});
```

### 3. `linkedSignal` 正式稳定 ✅

从开发者预览版升级为稳定版：

```typescript
import { signal, linkedSignal, computed } from '@angular/core';

// 地址表单示例
const country = signal('CN');

const cityMap: Record<string, string[]> = {
  'CN': ['北京', '上海', '深圳', '广州'],
  'US': ['New York', 'Los Angeles', 'Chicago'],
  'JP': ['东京', '大阪', '京都'],
};

const availableCities = computed(() => cityMap[country()] || []);

// 切换国家时，城市自动重置为第一个
// 用户也可以手动选择其他城市
const city = linkedSignal({
  source: country,
  computation: (c) => cityMap[c]?.[0] || ''
});

console.log(city()); // '北京'
city.set('上海');     // 手动修改
console.log(city()); // '上海'
country.set('US');    // 切换国家
console.log(city()); // 'New York' - 自动重置
```

### 4. `resource()` 正式稳定 ✅

```typescript
// resource 现在是稳定 API，可以放心在生产环境使用
const articleResource = resource({
  request: () => ({ slug: this.slug() }),
  loader: async ({ request, abortSignal }) => {
    const res = await fetch(`/api/articles/${request.slug}`, {
      signal: abortSignal
    });
    if (!res.ok) throw new Error('文章不存在');
    return res.json() as Promise<Article>;
  }
});

// 在模板中使用
// @switch (articleResource.status()) {
//   @case ('loading') { <skeleton /> }
//   @case ('resolved') { <article [data]="articleResource.value()!" /> }
//   @case ('error') { <error-message [error]="articleResource.error()" /> }
// }
```

### 5. `effect()` 行为改进

Angular 20 中 `effect()` 的行为更加可预测：

```typescript
// effect 现在默认在组件上下文中运行
// 组件销毁时自动清理
@Component({
  selector: 'app-logger',
  template: '...'
})
export class LoggerComponent {
  count = signal(0);

  constructor() {
    // 自动追踪依赖，自动清理
    effect(() => {
      console.log(`Count changed to: ${this.count()}`);
    });

    // 带清理函数的 effect
    effect((onCleanup) => {
      const id = setInterval(() => {
        this.count.update(v => v + 1);
      }, 1000);

      onCleanup(() => clearInterval(id));
    });
  }
}
```

### 6. 增量水合改进

增量水合在 Angular 20 中得到进一步完善：

```typescript
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(
      withIncrementalHydration()  // 启用增量水合
    )
  ]
});
```

### 7. 其他变更

- 支持 TypeScript 5.7 - 5.8
- 需要 Node.js 20+
- `output()` 的 `void` 类型改进
- 构建性能持续优化
- Angular DevTools 增强
- 改进的错误消息和诊断

**升级命令：**

```bash
ng update @angular/core@20 @angular/cli@20
```

---

## Angular 21（2025年11月）

Angular 21 带来了 **Signal Forms**、**Angular Aria 无障碍组件**、**Vitest 默认测试运行器**等重磅特性，同时多个 API 从预览版正式稳定。

### 1. Signal Forms（实验版）🧪 ⭐

全新的基于 Signals 的表单 API，允许开发者使用信号管理表单状态，提供更直观的表单创建体验：

```typescript
// Signal Forms 示例（实验版）
import { signal } from '@angular/core';

// Signal Forms 使用信号驱动表单状态
// 提供更直观的表单创建体验
// 支持与 Reactive Forms 渐进式迁移
```

Signal Forms 包含的核心能力：
- `FieldState.getError()` 方法--直接获取字段的特定验证错误
- `reloadValidation` 手动触发异步验证
- `validateAsync` 和 `validateHttp` 的 debounce 选项--减少不必要的异步验证请求
- 支持 `number|null` 绑定到 `<input type="text">`
- CVA（ControlValueAccessor）互操作--与现有 Reactive Forms 渐进式迁移

### 2. Angular Aria 无障碍组件（开发者预览版）🧪

提供 8 种无障碍、无样式（headless）的交互模式，开发者可以自定义样式来匹配自己的设计系统。这些组件遵循 WAI-ARIA 规范，开箱即用地提供键盘导航、屏幕阅读器支持等无障碍特性。

### 3. Vitest 成为默认测试运行器 ✅

Angular CLI 的 `ng test` 默认使用 Vitest，替代了 Karma。同时提供了实验性的 Karma 到 Vitest 迁移工具：

```bash
# ng test 现在默认使用 Vitest
ng test

# 从 Karma 迁移到 Vitest（实验性迁移工具）
ng generate @angular/core:karma-to-vitest
```

### 4. httpResource 正式稳定 ✅

从开发者预览版升级为稳定版，可以放心在生产环境中使用：

```typescript
import { httpResource } from '@angular/common/http';

// httpResource 现在是稳定 API ✅
const todosResource = httpResource<Todo[]>({
  url: () => `https://api.example.com/todos?userId=${this.userId()}`
});
```

### 5. 增量水合正式稳定 ✅

增量水合从开发者预览版升级为稳定版，SSR 性能进一步提升。结合 `@defer` 实现按需水合，大幅减少首屏 JavaScript 执行量。

### 6. Zoneless 稳定且默认 ✅

Zoneless 变更检测在 v20.2 稳定后，v21 中成为**新项目的默认配置**。使用 `ng new` 创建的新项目不再包含 `zone.js`，变更检测完全由 Signals 驱动。

```typescript
// Angular 21 新项目默认使用 Zoneless
// 不再需要手动配置 provideZonelessChangeDetection()
bootstrapApplication(AppComponent);
```

### 7. Signal 调试工具

Angular DevTools 中新增 Signal 调试 UI，可以检查和调试信号的值、依赖关系和变更历史，让 Signals 的调试体验大幅提升。

### 8. 其他变更

- 支持 TypeScript 5.8 - 5.9
- 需要 Node.js 20+
- 改进的 HMR 支持
- 模板 HMR 稳定

**升级命令：**

```bash
ng update @angular/core@21 @angular/cli@21
```

---

## Angular 22（预计 2026 年中发布）

Angular 22 目前处于 next 阶段（22.0.0-next.8，2026年4月15日），以下内容基于 next 版本，最终特性以官方发布为准。

### 1. 默认 OnPush 变更检测 ⭐

这是一个重大的行为变更--组件的 `changeDetection` 属性未定义时，默认为 `OnPush`。如需保持之前的行为，需显式设置 `ChangeDetectionStrategy.Eager`：

```typescript
// Angular 22 - 默认 OnPush
@Component({
  selector: 'app-example',
  template: '...'
})
export class ExampleComponent {}
// changeDetection 默认为 OnPush

// 如需旧行为
@Component({
  selector: 'app-eager',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '...'
})
export class EagerComponent {}
```

### 2. 移除 ComponentFactoryResolver & ComponentFactory

这两个已废弃的 API 被彻底移除。需要直接传递组件类给 `ViewContainerRef.createComponent` 或使用独立的 `createComponent` 函数：

```typescript
// ❌ Angular 22 之前的写法（已移除）
const factory = this.resolver.resolveComponentFactory(MyComponent);
const ref = this.container.createComponent(factory);

// ✅ Angular 22 的写法
const ref = this.container.createComponent(MyComponent);
// 或使用独立函数
import { createComponent } from '@angular/core';
const ref = createComponent(MyComponent, { environmentInjector });
```

### 3. 移除 Hammer.js 集成

Hammer.js 触摸手势集成被移除，开发者需要自行实现触摸手势处理或使用替代库。

### 4. 要求 TypeScript 6.0+

不再支持 TypeScript 5.9 及更早版本。TypeScript 6.0 由微软用 Go 重写编译器，带来 **5-10x 的编译速度提升**，这对大型 Angular 项目是重大利好。

### 5. 增量水合成为默认行为

`incremental hydration` 成为默认的水合策略，不再需要手动配置 `withIncrementalHydration()`。

### 6. AI 调试工具

Angular 22 引入了 AI 驱动的调试工具：
- Angular DI graph in-page AI tool--可视化依赖注入图
- AI runtime debugging tools--智能运行时调试
- 增强的性能分析（profiling）与文档 URL 关联

### 7. Shadow DOM 支持

支持在 Shadow Root 下启动 Angular 应用，为 Web Components 集成提供更好的支持。

### 8. Signal Forms 增强 🧪+

在 Angular 21 实验版的基础上持续改进：
- CVA 互操作改进
- `parseErrors` 支持旧版 NG_VALIDATORS
- 信号表单的 `controlValue` 改进

### 9. 编译器改进

- 支持 HTML 注释
- 安全导航操作符正确收窄可空类型
- 重复选择器编译时报错（NG8023）
- `strictTemplates` 在 `ng update` 时自动添加到 tsconfig

### 10. 其他 Breaking Changes

- `CanMatchFn` 的 `currentSnapshot` 参数变为必需
- 未使用的样式在关联 host 被移除时自动清理

> 注意：Angular 22 目前处于 next 阶段，以上特性可能在正式发布前有所调整。

---

## 全系列特性状态总览

### Signals 生态演进

| 特性 | 16 | 17 | 18 | 19 | 20 | 21 | 22 |
|------|----|----|----|----|----|----|----|
| signal / computed | 🧪 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| effect | 🧪 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| input() | - | 🧪 | ✅ | ✅ | ✅ | ✅ | ✅ |
| output() | - | 🧪 | ✅ | ✅ | ✅ | ✅ | ✅ |
| model() | - | 🧪 | ✅ | ✅ | ✅ | ✅ | ✅ |
| viewChild/viewChildren | - | 🧪 | ✅ | ✅ | ✅ | ✅ | ✅ |
| linkedSignal | - | - | - | 🧪 | ✅ | ✅ | ✅ |
| resource() | - | - | - | 🧪 | ✅ | ✅ | ✅ |
| httpResource | - | - | - | - | 🧪 | ✅ | ✅ |
| Signal Forms | - | - | - | - | - | 🧪 | 🧪+ |

### 构建与渲染演进

| 特性 | 16 | 17 | 18 | 19 | 20 | 21 | 22 |
|------|----|----|----|----|-----|----|----|
| esbuild 构建器 | 🧪 | ✅ 默认 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 新控制流 @if/@for | - | 🧪 | ✅ | ✅ | ✅ | ✅ | ✅ |
| @defer | - | 🧪 | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSR 水合 | 🧪 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 增量水合 | - | - | - | 🧪 | 🧪+ | ✅ | ✅ 默认 |
| Zoneless | - | - | 🧪 | 🧪 | ✅ | ✅ 默认 | ✅ |
| Standalone 默认 | - | 默认生成 | 默认生成 | 默认值 true | ✅ | ✅ | ✅ |
| 默认 OnPush | - | - | - | - | - | - | ✅ |

### 版本依赖要求

| Angular | TypeScript | Node.js | RxJS |
|---------|-----------|---------|------|
| 13 | 4.4 | 12.20+ / 14.15+ | 7.4+ |
| 14 | 4.6 - 4.7 | 14.15+ / 16.10+ | 7.4+ |
| 15 | 4.8 | 14.20+ / 16.13+ | 7.4+ |
| 16 | 4.9 - 5.0 | 16.14+ / 18.10+ | 7.4+ |
| 17 | 5.2 | 18.13+ | 7.4+ |
| 18 | 5.4 | 18.19+ | 7.4+ |
| 19 | 5.5 - 5.6 | 18.19+ | 7.4+ |
| 20 | 5.7 - 5.8 | 20+ | 7.4+ |
| 21 | 5.8 - 5.9 | 20+ | 7.4+ |
| 22 | 6.0+ | 20+ | 7.4+ |

---

## 从 Angular 13 到 22 的完整升级路径

### 推荐策略：逐版本升级

```bash
# 每次升级一个大版本
ng update @angular/core@14 @angular/cli@14
ng update @angular/core@15 @angular/cli@15
ng update @angular/core@16 @angular/cli@16
ng update @angular/core@17 @angular/cli@17
ng update @angular/core@18 @angular/cli@18
ng update @angular/core@19 @angular/cli@19
ng update @angular/core@20 @angular/cli@20
ng update @angular/core@21 @angular/cli@21
ng update @angular/core@22 @angular/cli@22
```

### 每个版本的关键迁移动作

| 升级到 | 必做 | 推荐做 |
|--------|------|--------|
| 14 | 处理 Typed Forms 类型错误（或用 Untyped* 过渡）| 尝试 Standalone Components |
| 15 | — | 迁移到 Standalone + provide* 函数 |
| 16 | — | 开始使用 Signals |
| 17 | 更新 Node.js 到 18+ | 迁移到新控制流语法 `ng g @angular/core:control-flow` |
| 18 | — | 尝试 Zoneless |
| 19 | — | 全面拥抱 Signals（input/output/model）|
| 20 | 更新 Node.js 到 20+ | 启用 Zoneless，使用 resource/httpResource |
| 21 | — | 使用 Signal Forms，迁移到 Vitest |
| 22 | 移除 ComponentFactory 用法，更新 TypeScript 到 6.0+ | 迁移到 OnPush，移除 Hammer.js 依赖 |

### 官方升级工具

Angular 官方提供了交互式升级指南，会根据你的当前版本和目标版本生成定制化的升级步骤：

👉 [https://angular.dev/update-guide](https://angular.dev/update-guide)

---

> 系列文章：
> - [（一）Angular 13-15 新特性详解](/posts/angular-features-13-to-15)
> - [（二）Angular 16-18 新特性详解](/posts/angular-features-16-to-18)
> - **（三）Angular 19-22 新特性详解**（本文）
