---
pubDatetime: 2026-05-01T11:00:00Z
title: Zone.js 谢幕，Signals 登场：Angular 17-19 变更检测完全指南
slug: angular-signals-zoneless
featured: false
draft: false
tags:
  - angular
  - signals
  - zoneless
  - frontend
description: 深入讲解 Angular Signals 体系：signal()、computed()、effect() 的核心 API，Zoneless 模式的开启方式，以及如何将存量 Zone.js 组件渐进式迁移到 Signals 架构。
---

## 前言

2020 年，我写过一篇关于 Angular Zone.js 与变更检测的文章，彼时 `ChangeDetectionStrategy.OnPush` + `async pipe` 已经是性能调优的终极武器。而今天，Angular 团队用 **Signals** 从根本上重新定义了变更检测。

Angular 17 带来了稳定的 Signals API，Angular 18 引入了实验性的 Zoneless 模式，Angular 19 让它更接近正式稳定。这是 Angular 自 Ivy 渲染引擎以来最重要的一次架构演进。

本文带你从 Zone.js 的局限出发，彻底理解 Signals 体系，并给出实际的迁移路径。

---

## 一、Zone.js 时代的痛点回顾

Zone.js 的魔法在于：它 monkey-patch 了所有浏览器异步 API（`setTimeout`、`Promise`、`addEventListener` 等），在每次异步操作完成后自动触发 Angular 的变更检测周期。

```typescript
// Zone.js 时代：这一切"魔法"让开发者几乎不用关心更新时机
@Component({
  template: `<p>{{ count }}</p>`,
})
class CounterComponent {
  count = 0;

  ngOnInit() {
    setTimeout(() => {
      this.count = 42; // Zone.js 捕获到 setTimeout 完成，自动触发检测
    }, 1000);
  }
}
```

### 1.1 Zone.js 的代价

**性能问题**：Zone.js 默认会对整棵组件树做脏检查（Default 策略），任何一次鼠标移动、HTTP 响应都可能触发数百个组件的检查。

```
任意异步事件
    ↓
ApplicationRef.tick()
    ↓
从根组件开始，递归检查整棵树
    ↓
即使绝大多数组件的数据根本没变
```

**包体积**：Zone.js 本身约 ~40KB（未压缩），是必须加载的运行时依赖。

**调试困难**：Zone.js 的堆栈跟踪被 patch 过，错误信息有时难以追踪。

**框架互操作**：在 Angular 之外创建的 Promise（如第三方 SDK）有时会意外触发变更检测。

### 1.2 OnPush 是治标不治本

`ChangeDetectionStrategy.OnPush` 确实大幅减少了不必要的检查，但它本质上是在 Zone.js 体系下做剪枝，而不是解决根本问题：

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ data.value }}`,
})
class MyComponent {
  @Input() data: { value: string };
  // 只有 @Input 引用变化 或 markForCheck() 时才重新检查
  // 但"何时需要检查"的决策权仍在框架，不在数据本身
}
```

Signals 的思路完全不同：**让数据自己知道谁在消费它，数据变了就精准通知消费者。**

---

## 二、Angular Signals 核心 API

### 2.1 signal()

`signal()` 创建一个可读写的响应式状态容器：

```typescript
import { signal } from "@angular/core";

const count = signal(0);

// 读取值
console.log(count()); // 0  ← 注意：是函数调用，不是属性

// 写入
count.set(1);

// 基于当前值更新
count.update(v => v + 1);

// 对象/数组：mutate（Angular 17.1 后改为直接 update）
const user = signal({ name: "Alice", age: 30 });
user.update(u => ({ ...u, age: 31 }));
```

**在模板中使用**：

```typescript
@Component({
  standalone: true,
  template: `
    <p>Count: {{ count() }}</p>
    <button (click)="increment()">+1</button>
  `,
})
class CounterComponent {
  count = signal(0);

  increment() {
    this.count.update(v => v + 1);
  }
  // 不需要 ChangeDetectorRef，不需要 async pipe
  // Angular 知道 count 变了，只更新这一处绑定
}
```

### 2.2 computed()

`computed()` 创建派生信号——从其他信号计算出来的只读值，自动追踪依赖：

```typescript
import { signal, computed } from "@angular/core";

const price = signal(100);
const quantity = signal(3);
const discount = signal(0.1);

// 自动追踪 price、quantity、discount 三个依赖
const total = computed(() => price() * quantity() * (1 - discount()));

console.log(total()); // 270

price.set(200);
console.log(total()); // 540  ← 自动重新计算，惰性求值
```

**惰性求值（Lazy）**：`computed` 不会在依赖变化时立即重算，只有下次有人读取它时才重新计算。这意味着没有消费者的 computed 不会浪费计算资源。

**缓存**：如果依赖没变，多次读取 `total()` 不会重新计算，直接返回缓存值。

```typescript
@Component({
  standalone: true,
  template: `
    <p>原价：{{ price() }}</p>
    <p>折后总价：{{ total() }}</p>
    <p>是否优惠：{{ isDiscounted() }}</p>
  `,
})
class OrderComponent {
  price = signal(100);
  quantity = signal(3);
  discount = signal(0.1);

  total = computed(
    () => this.price() * this.quantity() * (1 - this.discount())
  );
  isDiscounted = computed(() => this.discount() > 0);
}
```

### 2.3 effect()

`effect()` 在信号变化时执行副作用，类似于 `watch` 或 `useEffect`：

```typescript
import { signal, effect } from "@angular/core";

const theme = signal<"light" | "dark">("light");

// effect 会在创建时立即运行一次，之后每次 theme 变化时运行
const cleanup = effect(() => {
  document.body.className = theme();
  console.log(`Theme changed to: ${theme()}`);
});

theme.set("dark");
// 控制台输出：Theme changed to: dark
// document.body.className = 'dark'
```

**在组件中使用**：

```typescript
@Component({ standalone: true, template: "..." })
class ThemeComponent implements OnInit {
  theme = signal<"light" | "dark">("light");

  constructor() {
    // effect 必须在注入上下文中创建（构造函数或 ngOnInit 之前）
    effect(() => {
      localStorage.setItem("theme", this.theme());
    });
  }
}
```

**注意**：`effect` 内部不应该修改其他 signal，这会导致无限循环。如果确实需要，使用 `untracked()`：

```typescript
effect(() => {
  const current = this.count();
  // 读取 log 不追踪它（避免 log 变化触发 effect）
  untracked(() => {
    this.log.update(l => [...l, current]);
  });
});
```

---

## 三、从 Observable 到 Signal：互转工具

现有代码大量使用 RxJS Observable，Angular 提供了两个互转工具：

### 3.1 toSignal() — Observable → Signal

```typescript
import { toSignal } from "@angular/core/rxjs-interop";
import { HttpClient } from "@angular/common/http";

@Component({
  standalone: true,
  template: `
    @if (users()) {
      @for (user of users(); track user.id) {
        <p>{{ user.name }}</p>
      }
    } @else {
      <p>Loading...</p>
    }
  `,
})
class UserListComponent {
  private http = inject(HttpClient);

  // Observable 转 Signal，自动订阅，组件销毁时自动取消订阅
  users = toSignal(this.http.get<User[]>("/api/users"), { initialValue: null });
}
```

`toSignal` 的好处：

- 不再需要 `async pipe`
- 自动管理订阅生命周期
- 可以在 `computed()` 中组合多个来自 Observable 的信号

### 3.2 toObservable() — Signal → Observable

```typescript
import { toObservable } from "@angular/core/rxjs-interop";
import { debounceTime, switchMap } from "rxjs/operators";

@Component({ standalone: true, template: "..." })
class SearchComponent {
  private http = inject(HttpClient);

  query = signal("");

  // Signal → Observable，享用 RxJS 操作符的强大功能
  results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      switchMap(q => this.http.get<Result[]>(`/api/search?q=${q}`))
    ),
    { initialValue: [] }
  );
}
```

这种组合模式充分发挥了两者的优势：Signal 管理 UI 状态，RxJS 处理异步流。

---

## 四、Zoneless 模式

### 4.1 开启 Zoneless

Angular 18+ 提供了 `provideExperimentalZonelessChangeDetection()`：

```typescript
// main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideExperimentalZonelessChangeDetection } from "@angular/core";
import { AppComponent } from "./app.component";

bootstrapApplication(AppComponent, {
  providers: [provideExperimentalZonelessChangeDetection()],
});
```

同时从 `angular.json` 中移除 Zone.js polyfill：

```json
// angular.json
{
  "polyfills": [
    // 删除 "zone.js"
  ]
}
```

### 4.2 Zoneless 下的变更检测触发条件

没有 Zone.js 后，框架不再自动检测变化，只有以下情况会触发更新：

1. **Signal 的值发生变化**（主要路径）
2. **`AsyncPipe` 收到新值**
3. **手动调用 `ChangeDetectorRef.markForCheck()`**
4. **组件绑定的 `@Input()` 引用变化**

这意味着在 Zoneless 模式下，**所有状态都应该用 Signal 管理**，否则视图不会更新。

### 4.3 性能对比

以一个包含 1000 条数据的列表为例：

| 场景         | Zone.js（Default） | Zone.js（OnPush） | Zoneless + Signals   |
| ------------ | ------------------ | ----------------- | -------------------- |
| 单条数据更新 | 检查 ~1000 个绑定  | 检查受影响子树    | 只更新 1 个绑定      |
| 鼠标移动事件 | 触发全树检测       | 不触发            | 不触发               |
| 包体积       | +Zone.js ~40KB     | +Zone.js ~40KB    | 无额外开销           |
| 首屏时间     | 基线               | 基线              | -5~15%（视应用而定） |

---

## 五、Signal-based Inputs / Outputs（Angular 17.1+）

### 5.1 input() 替代 @Input()

```typescript
import { input, output, model } from "@angular/core";

@Component({
  standalone: true,
  selector: "app-user-card",
  template: `
    <h2>{{ user().name }}</h2>
    <p>{{ user().email }}</p>
    <button (click)="onEdit()">编辑</button>
  `,
})
class UserCardComponent {
  // 替代 @Input() user: User
  user = input.required<User>();

  // 可选 input，带默认值
  showAvatar = input(true);

  // 替代 @Output() editClicked = new EventEmitter()
  editClicked = output<void>();

  onEdit() {
    this.editClicked.emit();
  }
}
```

### 5.2 model() — 双向绑定

`model()` 是可读写的 input signal，用于双向绑定：

```typescript
@Component({
  selector: "app-input",
  template: `<input
    [value]="value()"
    (input)="value.set($event.target.value)"
  />`,
})
class InputComponent {
  value = model(""); // 相当于 @Input() + @Output() valueChange
}

// 父组件使用
// <app-input [(value)]="mySignal" />
```

---

## 六、迁移策略：存量组件渐进改造路径

Angular Signals 完全向后兼容，可以渐进式迁移。推荐的迁移顺序：

### 阶段一：新组件全部用 Signals

```typescript
// 所有新建组件使用：
// - standalone: true
// - signal() 管理本地状态
// - input() 替代 @Input()
// - output() 替代 @Output()
// - toSignal() 处理 HTTP/Observable
```

### 阶段二：迁移存量 OnPush 组件

OnPush 组件最容易迁移，因为它们的数据流已经比较清晰：

```typescript
// 迁移前
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ user?.name }}`,
})
class UserComponent {
  @Input() user?: User;

  constructor(private cdr: ChangeDetectorRef) {}

  someAsyncUpdate() {
    this.user = newUser;
    this.cdr.markForCheck();
  }
}

// 迁移后
@Component({
  standalone: true,
  template: `{{ user().name }}`,
})
class UserComponent {
  user = input.required<User>();
  // 不再需要 cdr，不再需要 OnPush 标注
}
```

### 阶段三：迁移 Default 策略组件

Default 策略的组件通常有更复杂的状态管理，需要先梳理清楚哪些状态需要驱动视图更新：

```typescript
// 迁移前（Default 策略，依赖 Zone.js）
@Component({
  template: `<p>{{ items.length }}</p>`,
})
class ListComponent {
  items: Item[] = [];

  ngOnInit() {
    this.dataService.getItems().subscribe(items => {
      this.items = items; // Zone.js 自动触发检测
    });
  }
}

// 迁移后
@Component({
  standalone: true,
  template: `<p>{{ items().length }}</p>`,
})
class ListComponent {
  private dataService = inject(DataService);

  items = toSignal(this.dataService.getItems(), { initialValue: [] as Item[] });
}
```

---

## 七、2026 年现状：官方文档复核（Angular.dev）

> 注：本节采用“双视角”写法。左列保留 v19 语境下的历史定位，右列是我在 2026-05-01 对 angular.dev 的复核结果。

| 能力                                          | v19 历史语境                | 2026-05 官方文档复核                                                                   |
| --------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `signal()`, `computed()`, `effect()`          | ✅ 已是核心能力             | ✅ Signals 已是主线。`effect` API 页标注 `stable since v20.0`                          |
| `toSignal()`, `toObservable()`                | ✅ 常用互操作能力           | ✅ `toObservable` API 页标注 `stable since v20.0`；`toSignal` 无 experimental 警告     |
| `input()`, `output()`, `model()`              | ✅ v19 推荐的声明式组件 API | ✅ `output`、`model` API 页标注 `stable since v19.0`；`input` 在组件指南中作为推荐写法 |
| `viewChild()`, `contentChild()`（函数式查询） | ✅ v19 新一代查询 API       | ✅ 两者 API 页均标注 `stable since v19.0`                                              |
| Zoneless（无 Zone.js）                        | 🔶 v19 属于 Preview 阶段    | ✅ 文档显示：v20 通过 `provideZonelessChangeDetection()` 开启；v21 起默认 zoneless     |
| Signal Forms                                  | ❌ v19 不存在该能力         | 🔶 `@angular/forms/signals` 在 v21+ 可用，但文档明确标注 experimental                  |
| “Signal-based Router” 作为独立官方特性名      | ⚠️ 不准确                   | ℹ️ 官方路由文档未将其作为独立特性条目发布，建议删除该说法                              |

---

## 总结

把时间线拉直后，结论会更准确：

1. 在 v19 语境下，Signals 生态（含函数式输入/输出/查询）已可作为主流实践。
2. Zoneless 在 v19 还是 Preview，但到 v21 已成为默认模式。
3. Signal Forms 不是 v19 特性，而是 v21+ 的 experimental 能力。

所以迁移策略仍然成立：先把组件状态迁移到 signal/input/output/model/query 这条稳定主线，再按版本节奏推进 Zoneless 与 Signal Forms。

---

## 参考资料

- [Angular Signals Guide](https://angular.dev/guide/signals) — angular.dev
- [RFC: Angular Signals](https://github.com/angular/angular/discussions/49685) — Angular GitHub
- [Angular without ZoneJS (Zoneless)](https://angular.dev/guide/zoneless) — angular.dev
- [Signal Inputs RFC](https://github.com/angular/angular/discussions/50719) — Angular GitHub
- [RxJS interop with Angular signals](https://angular.dev/ecosystem/rxjs-interop) — angular.dev
- [Forms with Angular Signals (experimental)](https://angular.dev/guide/forms/signals/overview) — angular.dev
- [Angular v19 Release Notes](https://blog.angular.dev/meet-angular-v19-7b29dfd05b84)
