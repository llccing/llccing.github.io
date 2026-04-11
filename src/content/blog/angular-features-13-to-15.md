---
pubDatetime: 2026-04-11T20:00:00+08:00
title: Angular 升级指南（一）：Angular 13-15 新特性详解
slug: angular-features-13-to-15
featured: false
draft: false
tags: ["angular"]
description: 从 Angular 13 到 15，框架经历了 Ivy 全面接管、Typed Forms、Standalone Components 等里程碑式变革。本文逐版本梳理每个新特性的使用方式与升级要点。
---

> 本文是 Angular 升级系列教程的第一篇，覆盖 Angular 13、14、15 三个版本。系列文章：
> - **（一）Angular 13-15 新特性详解**（本文）
> - [（二）Angular 16-18 新特性详解](/posts/angular-features-16-to-18)
> - [（三）Angular 19-21 新特性详解](/posts/angular-features-19-to-21)

---

## Angular 13（2021年11月）

### 1. 彻底移除 View Engine，全面使用 Ivy

Angular 13 是一个分水岭——旧的 View Engine 渲染引擎被完全移除，Ivy 成为唯一的渲染引擎。这意味着：

- 不再需要 `enableIvy` 配置
- 所有库都必须发布 Ivy 兼容的版本
- 编译产物更小，运行时性能更好

**升级要点：** 如果你的项目依赖了还在用 View Engine 的第三方库，需要等库作者更新或寻找替代方案。

### 2. 动态组件创建简化

不再需要 `ComponentFactoryResolver`，可以直接传递组件类：

```typescript
// ❌ Angular 12 及之前
@Component({
  selector: 'app-parent',
  template: '<ng-container #container></ng-container>'
})
export class ParentComponent {
  @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;

  constructor(private cfr: ComponentFactoryResolver) {}

  createComponent() {
    const factory = this.cfr.resolveComponentFactory(ChildComponent);
    this.container.createComponent(factory);
  }
}

// ✅ Angular 13+
@Component({
  selector: 'app-parent',
  template: '<ng-container #container></ng-container>'
})
export class ParentComponent {
  @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;

  createComponent() {
    this.container.createComponent(ChildComponent);
  }
}
```

### 3. `HttpClientModule` 中 `APM` 改进

Angular 13 改进了 `HttpContext`，允许在 HTTP 请求中传递元数据：

```typescript
import { HttpContext, HttpContextToken } from '@angular/common/http';

const IS_CACHE_ENABLED = new HttpContextToken<boolean>(() => false);

// 发送请求时附带上下文
this.http.get('/api/data', {
  context: new HttpContext().set(IS_CACHE_ENABLED, true)
});

// 在拦截器中读取
intercept(req: HttpRequest<any>, next: HttpHandler) {
  if (req.context.get(IS_CACHE_ENABLED)) {
    // 走缓存逻辑
  }
  return next.handle(req);
}
```

### 4. Angular CLI 持久化构建缓存

默认启用构建缓存，显著提升重复构建速度：

```json
// angular.json
{
  "cli": {
    "cache": {
      "enabled": true,
      "path": ".angular/cache",
      "environment": "all"
    }
  }
}
```

### 5. TypeScript 4.4 支持

支持 TypeScript 4.4，带来更好的类型推断和控制流分析。

### 6. 其他变更

- `TestBed` 自动清理 DOM（不再需要手动 `destroyAfterEach`）
- `routerLink` 支持 `null` 和 `undefined`（禁用链接）
- Adobe Fonts 内联支持
- 移除了 IE11 支持

**升级命令：**

```bash
ng update @angular/core@13 @angular/cli@13
```

---

## Angular 14（2022年6月）

### 1. Typed Reactive Forms（类型化表单）⭐

这是 Angular 14 最重要的特性。`FormControl`、`FormGroup`、`FormArray` 终于有了严格的类型推断：

```typescript
// ❌ Angular 13 及之前 — 所有值都是 any
const form = new FormGroup({
  name: new FormControl(''),
  age: new FormControl(0),
});
const name = form.value.name; // any 😢

// ✅ Angular 14+ — 完整类型推断
const form = new FormGroup({
  name: new FormControl('', { nonNullable: true }),
  age: new FormControl(0, { nonNullable: true }),
  email: new FormControl<string | null>(null),
});

const name = form.value.name; // string ✅
const age = form.value.age;   // number ✅
const email = form.value.email; // string | null ✅
```

`nonNullable` 选项确保 `reset()` 时恢复初始值而非 `null`：

```typescript
const name = new FormControl('默认值', { nonNullable: true });
name.reset(); // 值变为 '默认值'，而不是 null
```

`FormBuilder` 也支持了类型化：

```typescript
// 使用 NonNullableFormBuilder
constructor(private fb: NonNullableFormBuilder) {}

ngOnInit() {
  this.form = this.fb.group({
    name: [''],
    age: [0],
    tags: this.fb.array(['angular', 'typescript']),
  });
  // 所有字段自动推断类型，且 nonNullable
}
```

**升级要点：** 如果现有代码有大量 `FormControl`，可以先用 `UntypedFormControl` 等过渡 API 保持兼容，再逐步迁移：

```typescript
// 过渡方案 — 行为与旧版完全一致
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

const form = new UntypedFormGroup({
  name: new UntypedFormControl(''),
});
```

### 2. Standalone Components（独立组件）开发者预览版 🧪

Angular 14 引入了 Standalone Components 的概念——组件不再必须属于某个 `NgModule`：

```typescript
// 独立组件 — 不需要声明在任何 NgModule 中
@Component({
  standalone: true,
  selector: 'app-hello',
  imports: [CommonModule], // 直接在组件级别导入依赖
  template: `
    <h1>Hello {{ name }}</h1>
    <p *ngIf="showDetails">这是一个独立组件</p>
  `
})
export class HelloComponent {
  @Input() name = 'World';
  showDetails = true;
}

// 在其他组件中使用
@Component({
  standalone: true,
  imports: [HelloComponent], // 直接导入组件
  template: '<app-hello name="Angular" />'
})
export class AppComponent {}
```

独立组件也可以用于路由：

```typescript
// 路由配置 — 直接使用独立组件
const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard.component')
      .then(m => m.DashboardComponent)
  }
];
```

### 3. inject() 函数

可以在构造函数之外使用 `inject()` 获取依赖：

```typescript
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-user',
  template: '...'
})
export class UserComponent {
  // 不再需要 constructor(private http: HttpClient)
  private http = inject(HttpClient);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  loadUser() {
    return this.http.get('/api/user');
  }
}
```

`inject()` 在创建可复用的工具函数时特别有用：

```typescript
// 可复用的工具函数
function injectDestroy() {
  const subject = new Subject<void>();
  const ref = inject(DestroyRef);
  ref.onDestroy(() => {
    subject.next();
    subject.complete();
  });
  return subject.asObservable();
}

// 在组件中使用
@Component({ ... })
export class MyComponent {
  private destroy$ = injectDestroy();

  ngOnInit() {
    this.someObservable$.pipe(
      takeUntil(this.destroy$)
    ).subscribe();
  }
}
```

### 4. 页面标题策略（Title Strategy）

路由配置中可以直接设置页面标题：

```typescript
const routes: Routes = [
  { path: '', component: HomeComponent, title: '首页' },
  { path: 'about', component: AboutComponent, title: '关于我们' },
  { path: 'products', component: ProductsComponent, title: '产品列表' },
];

// 自定义标题策略
@Injectable({ providedIn: 'root' })
export class CustomTitleStrategy extends TitleStrategy {
  constructor(private title: Title) { super(); }

  override updateTitle(routerState: RouterStateSnapshot) {
    const title = this.buildTitle(routerState);
    if (title) {
      this.title.setTitle(`我的应用 | ${title}`);
    }
  }
}

// 注册自定义策略
providers: [
  { provide: TitleStrategy, useClass: CustomTitleStrategy }
]
```

### 5. 增强的模板诊断

编译器能检测出更多模板中的问题：

```typescript
// 编译器会警告：双向绑定中的空值合并操作符无效
<input [(ngModel)]="user.name ?? '默认值'" />
// ⚠️ Warning: nullish coalescing in two-way binding is not supported

// 编译器会警告：未使用的 ngFor 变量
<div *ngFor="let item of items; let i = index">
  {{ item.name }}
  <!-- ⚠️ 如果 i 未使用，会有提示 -->
</div>
```

### 6. 其他变更

- 支持 TypeScript 4.7
- `ng completion` 命令行自动补全
- `@angular/cdk` 支持 `Dialog` 和 `Listbox` 原语
- `ngOnDestroy` 可以注入使用
- 可选注入器（`inject()` 支持 `{ optional: true }`）

**升级命令：**

```bash
ng update @angular/core@14 @angular/cli@14
```

---

## Angular 15（2022年11月）

### 1. Standalone APIs 正式稳定 ✅

Angular 15 将 Standalone Components/Directives/Pipes 标记为稳定版，并提供了完整的独立应用引导方式：

```typescript
// main.ts — 不再需要 AppModule
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app.component';
import { routes } from './app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
  ]
});
```

提供了 `provide*` 系列函数替代 Module imports：

```typescript
// ❌ 旧方式 — 通过 Module
@NgModule({
  imports: [
    RouterModule.forRoot(routes),
    HttpClientModule,
    BrowserAnimationsModule,
  ]
})
export class AppModule {}

// ✅ 新方式 — 通过 provide 函数
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withFetch(), // 使用 fetch API 替代 XMLHttpRequest
    ),
    provideAnimations(),
  ]
});
```

### 2. 函数式路由守卫和解析器

不再需要创建类来实现守卫，直接用函数：

```typescript
// ❌ Angular 14 及之前 — 类守卫
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.isLoggedIn()) return true;
    this.router.navigate(['/login']);
    return false;
  }
}

// ✅ Angular 15+ — 函数式守卫
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};

// 路由配置
const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [authGuard],
    component: DashboardComponent
  }
];
```

函数式解析器：

```typescript
// 函数式 Resolver
export const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  return userService.getUser(route.paramMap.get('id')!);
};

const routes: Routes = [
  {
    path: 'user/:id',
    component: UserDetailComponent,
    resolve: { user: userResolver }
  }
];
```

### 3. 函数式 HTTP 拦截器

```typescript
// ❌ 旧方式 — 类拦截器
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = inject(AuthService).getToken();
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next.handle(authReq);
  }
}

// ✅ Angular 15+ — 函数式拦截器
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  const authReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`)
  });
  return next(authReq);
};

// 注册
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, loggingInterceptor])
    )
  ]
});
```

### 4. Directive Composition API（指令组合 API）

可以在组件的 `hostDirectives` 中组合多个指令：

```typescript
// 定义可复用的指令
@Directive({
  standalone: true,
  selector: '[tooltip]',
  host: { '(mouseenter)': 'show()', '(mouseleave)': 'hide()' }
})
export class TooltipDirective {
  @Input() tooltip = '';
  show() { /* 显示提示 */ }
  hide() { /* 隐藏提示 */ }
}

@Directive({
  standalone: true,
  selector: '[highlight]',
  host: { '(mouseenter)': 'onHover()', '(mouseleave)': 'onLeave()' }
})
export class HighlightDirective {
  @Input() highlightColor = 'yellow';
  onHover() { /* 高亮 */ }
  onLeave() { /* 取消高亮 */ }
}

// 在组件中组合指令
@Component({
  selector: 'app-fancy-button',
  hostDirectives: [
    {
      directive: TooltipDirective,
      inputs: ['tooltip'],
    },
    {
      directive: HighlightDirective,
      inputs: ['highlightColor'],
      outputs: [],
    }
  ],
  template: '<button><ng-content /></button>'
})
export class FancyButtonComponent {}

// 使用时自动拥有两个指令的能力
// <app-fancy-button tooltip="点击提交" highlightColor="blue">提交</app-fancy-button>
```

### 5. Image Directive（`NgOptimizedImage`）稳定版

Angular 15 将图片优化指令标记为稳定版：

```typescript
import { NgOptimizedImage } from '@angular/common';

@Component({
  standalone: true,
  imports: [NgOptimizedImage],
  template: `
    <!-- 自动优化：lazy loading、fetchpriority、srcset 等 -->
    <img ngSrc="hero.jpg" width="800" height="600" priority />

    <!-- 自动生成 srcset -->
    <img ngSrc="product.jpg" width="400" height="300"
         ngSrcset="200w, 400w, 800w" />

    <!-- 填充模式 -->
    <div style="position: relative; width: 100%; height: 300px;">
      <img ngSrc="banner.jpg" fill />
    </div>
  `
})
export class ImageExampleComponent {}
```

配置图片 CDN loader：

```typescript
// app.config.ts
import { provideImageKitLoader } from '@angular/common';

providers: [
  provideImageKitLoader('https://ik.imagekit.io/your_id')
]
```

### 6. `DestroyRef` 和 `takeUntilDestroyed`

更优雅地处理组件销毁时的清理工作：

```typescript
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-data',
  template: '{{ data }}'
})
export class DataComponent {
  data = '';

  constructor() {
    // 方式一：takeUntilDestroyed — 组件销毁时自动取消订阅
    inject(HttpClient).get('/api/data').pipe(
      takeUntilDestroyed()
    ).subscribe(res => this.data = res);
  }

  // 方式二：DestroyRef — 手动注册清理回调
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    const timer = setInterval(() => console.log('tick'), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }
}
```

### 7. 路由懒加载改进

支持懒加载独立组件和路由配置：

```typescript
const routes: Routes = [
  // 懒加载独立组件
  {
    path: 'profile',
    loadComponent: () => import('./profile.component')
      .then(m => m.ProfileComponent)
  },
  // 懒加载子路由配置
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes')
      .then(m => m.ADMIN_ROUTES)
  }
];

// admin/admin.routes.ts
export const ADMIN_ROUTES: Routes = [
  { path: '', component: AdminDashboardComponent },
  { path: 'users', component: AdminUsersComponent },
];
```

### 8. 其他变更

- 支持 TypeScript 4.8
- `@angular/router` 支持 `RouterModule.forRoot(routes, { bindToComponentInputs: true })` — 路由参数自动绑定到组件 Input
- `esbuild` 构建器实验性支持
- `ng generate` 默认生成 standalone 组件（v15.2+）
- MDC-based Angular Material 组件（Material Design Components for Web）
- 移除了 `@angular/flex-layout` 的官方支持

**升级命令：**

```bash
ng update @angular/core@15 @angular/cli@15

# 自动迁移到 standalone（可选）
ng generate @angular/core:standalone
```

---

## 升级路径总结

| 版本 | TypeScript | Node.js | 关键升级动作 |
|------|-----------|---------|-------------|
| 13 | 4.4 | 12.20+ / 14.15+ | 移除 View Engine 相关代码 |
| 14 | 4.6-4.7 | 14.15+ / 16.10+ | 迁移到 Typed Forms（或先用 Untyped* 过渡）|
| 15 | 4.8 | 14.20+ / 16.13+ | 迁移到 Standalone + provide* 函数 |

每次升级建议使用 Angular 官方的升级指南：[https://angular.dev/update-guide](https://angular.dev/update-guide)

```bash
# 逐版本升级（推荐）
ng update @angular/core@13 @angular/cli@13
ng update @angular/core@14 @angular/cli@14
ng update @angular/core@15 @angular/cli@15
```

> 下一篇：[Angular 升级指南（二）：Angular 16-18 新特性详解](/posts/angular-features-16-to-18)
