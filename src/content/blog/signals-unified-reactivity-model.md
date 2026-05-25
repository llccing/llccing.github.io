---
pubDatetime: 2026-05-24T16:00:00Z
title: "Signals 内在原理：从 Vue Reactivity 到 Angular Signals 的响应式编程统一模型"
slug: signals-unified-reactivity-model
featured: false
draft: false
tags:
  - vue
  - angular
  - signals
  - frontend
  - reactivity
description: "把 Vue 2/3、Angular Signals、Solid.js 与 TC39 Signals Proposal 放进同一张坐标系：依赖追踪、变化传播、副作用调度。理解不同框架响应式系统背后的共同模型，而不是只记 API。"
---

## 前言

2019 年，我写过一组 Vue 源码分析文章，其中响应式系统是最让我着迷的一块。那时我们讨论的是 `Object.defineProperty`、`Dep`、`Watcher`，讨论的是“改了一个对象属性，DOM 为什么会自己更新”。

几年之后，Angular 也把自己的核心更新机制推向了 **Signals**。表面上看，这是一个框架 API 的变化：`count` 变成了 `count()`，`@Input()` 旁边开始出现 `input()`，模板里的更新逻辑变得越来越“像 Vue，像 Solid，像 Preact”。

但如果只把它理解成“Angular 学了 Vue”或者“前端框架又一次互相借鉴”，理解仍然停留在表层。

真正值得写一篇长文的，是下面这个事实：

> Vue 3 的 `ref()`、Angular 的 `signal()`、Solid.js 的 `createSignal()`，虽然 API 细节不同，但它们正在收敛到同一类响应式编程模型。

这类模型的核心，不是某个具体函数名，而是三件事：

1. **依赖追踪**：谁依赖谁？
2. **变化传播**：某个状态变化后，哪些结果可能失效？
3. **副作用调度**：什么时候真正去重算、渲染、执行副作用？

如果把这三件事讲清楚，你会发现 Vue 2 到 Vue 3 的演进、Angular 从 Zone.js 到 Signals 的转向、TC39 为什么开始推进 Signals 标准化，背后其实是同一条技术路线。

本文想做的，就是把这些看似分散的话题放回一张统一地图中。

---

## 一、为什么今天要重新理解响应式

### 1.1 响应式从来不是“语法糖”

很多开发者第一次接触响应式，会把它理解成一种框架能力：

- Vue 能监听数据变化
- Angular 能自动刷新模板
- Solid 能细粒度更新 DOM

这种理解没有错，但不够深。

响应式真正解决的问题是：**程序中的“值之间的依赖关系”如何显式地、可维护地、可调度地运行起来。**

看一个最小例子：

```typescript
const count = 1;
const isEven = count % 2 === 0;
const label = isEven ? "even" : "odd";
```

这是普通的命令式代码。它表达了依赖关系，但依赖关系只存在于“这一刻”的执行过程中：

- `isEven` 依赖 `count`
- `label` 依赖 `isEven`

一旦 `count` 后续发生变化，这个依赖关系不会自己继续工作。你必须重新执行整段代码，或者手动写通知逻辑。

响应式系统所做的事情，本质上是把这种“一次性的依赖关系”升级为“持续有效的依赖图”。

### 1.2 框架真正难的，不是知道值变了，而是知道谁该更新

只知道“某个值变了”远远不够。

真正复杂的是下面三个问题：

1. 一个派生值依赖了哪些基础状态？
2. 当基础状态变化后，哪些派生值只是“可能失效”，哪些必须立刻更新？
3. 当多个依赖链条交叉时，怎样避免重复计算和中间态错误？

这正是为什么现代响应式框架最终都要面对同一批工程难题：

- 动态依赖
- 缓存失效
- 调度时机
- glitch-free 执行
- 生命周期与清理

如果只盯着 `ref()`、`signal()` 或 `createSignal()` 这些表面 API，你会觉得它们“有点像”。

如果盯着依赖图、脏标记、watcher/effect 调度，你会发现它们其实是在回答同一组问题。

---

## 二、统一模型：依赖追踪 -> 变化传播 -> 副作用调度

### 2.1 第一阶段：依赖追踪

任何 Signals 风格的系统，第一步都要回答一个问题：

> 当我执行一个派生计算时，怎么知道它依赖了哪些源状态？

最常见的答案是：**在“当前正在计算的消费者”与“被读取的生产者”之间建立连接。**

你可以把它想象成一套极简机制：

```typescript
let activeConsumer: (() => void) | null = null;

function track(producer: Set<() => void>) {
  if (activeConsumer) {
    producer.add(activeConsumer);
  }
}

function runWithTracking<T>(consumer: () => T): T {
  const prev = activeConsumer;
  activeConsumer = consumer;
  try {
    return consumer();
  } finally {
    activeConsumer = prev;
  }
}
```

当一个 `computed`、`effect`、模板表达式开始执行时，它会把自己放到一个“当前活跃消费者”的上下文里。此后凡是被读取到的 signal/ref/state，都把这个消费者登记为自己的依赖者。

这就是自动依赖追踪的核心。

它的价值非常大：

- 你不需要手写订阅列表
- 依赖关系来自真实运行时读取，而不是靠人维护
- 分支依赖可以动态切换

例如：

```typescript
const showCount = signal(false);
const count = signal(0);

const label = computed(() => {
  return showCount() ? `count: ${count()}` : "hidden";
});
```

当 `showCount()` 为 `false` 时，这个 `computed` 根本不会读取 `count()`，于是 `count` 就不会成为当前计算的依赖。

这意味着：**现代响应式系统记录的不是“静态源码引用”，而是“这一次真实执行所读到的依赖集合”。**

### 2.2 第二阶段：变化传播

依赖图建立之后，下一步不是立刻重算，而是先回答另一个问题：

> 某个源状态写入后，应该怎样把“可能失效”这件事沿依赖图传播出去？

这一步常被叫做：

- invalidation
- dirty marking
- propagation
- graph coloring

最朴素的做法是“立刻重算所有下游”。

这在小图里似乎没问题，但只要出现共享依赖，就会立刻暴露问题。

看经典的 diamond dependency：

```text
    count
   /     \
isEven  parityText
   \     /
    summary
```

如果 `count` 变化后采用 naive push：

1. 先推 `isEven`
2. 再推 `parityText`
3. 再分别触发 `summary`

那么 `summary` 很可能被计算两次，甚至短暂看到中间态。

因此现代 Signals 系统通常不会在传播阶段就“执行最终计算”，而是先做更克制的事情：

- 标记哪些节点脏了
- 标记哪些节点可能脏了
- 记录哪些 effect 或 watcher 需要未来某个时刻处理

这一步的本质，不是生产最终值，而是**把依赖图从 clean 状态推进到一个一致的待处理状态**。

### 2.3 第三阶段：副作用调度

第三阶段最容易被忽略，但它决定了框架工程体验。

因为“值如何变化”和“什么时候执行副作用”其实是两层不同的问题。

例如：

- `computed` 什么时候重算？
- effect 什么时候重新运行？
- 模板什么时候刷新？
- 多次写入是合并、批处理，还是逐次暴露？

这就是调度层。

很多响应式误解都来自把第二阶段和第三阶段混为一谈：

- 脏标记是传播，不等于立刻执行副作用
- `computed` 失效不等于它已经重算
- effect 的存在不等于框架必须立刻执行 DOM 写入

因此，一个统一的理解方式是：

```text
读 -> 建依赖
写 -> 传播失效
调度 -> 选择合适时机执行重算与副作用
```

把这个框架记住，后面所有 Vue、Angular、Solid、TC39 的差异，都会变得更好解释。

---

## 三、Vue 的演进：从 Object.defineProperty 到 Proxy，再到 Signals 化思维

### 3.1 Vue 2 的伟大之处，是把对象属性变成了可观察单元

Vue 2 的响应式系统之所以经典，是因为它在 ES5 能力边界内做到了极高完成度。

它的核心思路并不神秘：

1. 用 `Object.defineProperty` 为每个属性注入 getter/setter
2. getter 中做依赖收集
3. setter 中做通知更新

这也是我在 2019 年那篇 [Vue.js 深入响应式原理](/posts/vue-analysis-responsive) 里重点拆过的部分。

你可以把它抽象成：

```javascript
function defineReactive(obj, key, val) {
  const dep = new Dep();

  Object.defineProperty(obj, key, {
    get() {
      dep.depend();
      return val;
    },
    set(newVal) {
      val = newVal;
      dep.notify();
    },
  });
}
```

注意，这已经具备了我们上文说的三阶段雏形：

- getter 负责依赖追踪
- setter 负责变化传播
- watcher 队列负责异步调度和去重

换句话说，Vue 2 并不是“没有 Signals”。

更准确地说，**Vue 2 的 signal 粒度仍然主要绑定在对象属性层面，而不是一个显式的一等 state cell。**

### 3.2 Vue 2 的限制，不是理念错误，而是宿主能力限制

Vue 2 的问题大家都很熟悉：

- 无法原生拦截属性新增/删除
- 数组变异方法需要特殊处理
- 初始化时需要深度遍历对象做响应式转换
- 响应式行为和对象结构强绑定

这些缺点并不是 Vue 团队“不懂响应式”，而是 `Object.defineProperty` 时代的宿主能力决定的。

也正因为如此，Vue 3 转向 Proxy 不是偶然事件，而是历史逻辑上的自然升级。

### 3.3 Vue 3 的 Proxy 解决的是“拦截对象操作”，不是替代依赖图

在 [Vue 3 的开发进展](/posts/translate-making-vue3) 里，Evan You 讲得很清楚：Proxy 的价值，在于能更完整地拦截对象操作，从而消除 Vue 2 中的一批响应式死角。

但要特别注意一件事：

> Proxy 解决的是“怎么观察对象”，并不直接等于“完整的响应式系统已经成立”。

因为响应式系统真正不可替代的部分仍然是：

- 当前活跃 effect/computed 的上下文
- source -> sink 的依赖图
- 失效传播与调度

Proxy 只是让“对象属性读取/写入”更容易进入这套机制。

它不是响应式本身，最多只是响应式系统更好的入口。

### 3.4 `ref()` 的出现，说明 Vue 自己也在走向 signal cell 抽象

很多人会把 Vue 3 的 `reactive()` 当成主角，但从响应式抽象层面看，`ref()` 更接近现代 Signals 模型。

为什么？

因为 `ref()` 把“一个可变值单元”显式抽了出来：

```typescript
const count = ref(0);
const double = computed(() => count.value * 2);
```

这里的 `count` 不再是某个对象上的隐藏响应式属性，而是一个一等的、可被传递、可被组合、可被派生的状态单元。

这正是 Signals 思维的关键一步。

所以从历史上看，Vue 的路线其实是：

```text
对象属性可观察
-> 对象操作可拦截
-> 状态单元显式化
```

这条路走到 `ref()` 这里，已经离现代 Signals 非常近了。

---

## 四、Angular 的演进：从 Zone.js 到 Signals，是把“刷新责任”收回状态图

### 4.1 Zone.js 模式解决的是“什么时候检查”，不是“谁需要更新”

Angular 老一代变更检测的核心思想，不是精确依赖追踪，而是：

1. 用 Zone.js patch 异步 API
2. 只要异步任务结束，就触发一次 change detection
3. 从根视图开始向下检查模板绑定

这套模型在 DX 上非常成功，因为开发者几乎不用显式声明响应式依赖。

但代价也很明显，正如我在 [Angular Zone.js](/posts/angular-zone) 和 [Zone.js 谢幕，Signals 登场：Angular 17-19 变更检测完全指南](/posts/angular-signals-zoneless) 里反复强调过的：

- 框架知道“某些异步完成了”
- 却不知道“具体哪块状态变了”
- 更不知道“哪几个绑定真正依赖那块状态”

于是它只能采用较粗粒度的策略：再检查一遍。

### 4.2 OnPush 是剪枝，不是改写底层模型

`OnPush` 的历史意义很大，但它解决的是“检查太多”的问题，不是“依赖关系不透明”的问题。

`OnPush` 仍然活在 top-down change detection 世界里，只是尽量减少无意义遍历。

因此它更像是：

- 对已有框架调度模型做优化
- 而不是让状态自己带着依赖图工作

这也是为什么 Angular 需要 Signals。

真正需要被改写的，不是“如何更快检查整棵树”，而是“为什么非要检查整棵树”。

### 4.3 Signals 让 Angular 获得了细粒度的状态图

Angular Signals 最重要的意义，不只是新增了 `signal()` / `computed()` / `effect()` 三个 API。

更重要的是：Angular 首次在框架内部拥有了一张可显式维护的细粒度依赖图。

这件事带来的变化是根本性的：

- 模板读取 signal 时，框架知道这个 view 依赖了哪个状态
- signal 改变时，框架可以只标记相关 view
- `computed` 可以沿状态图做失效传播和懒重算
- zoneless 才真正有现实基础

Angular 官方文档对 `computed` 的表述非常明确：**computed signals are both lazily evaluated and memoized**。

这点非常关键，因为它说明 Angular Signals 并不是简单地“写入即重算一切”，而是采用了更成熟的 push-pull 组合策略：

- 写入时同步传播失效信息
- 读取时按需拉取最新计算结果
- effect 与模板刷新由框架在合适时机调度

这和 Zone.js 时代“任何异步都可能导致整棵树检查”的模型，已经不是一个级别的机制了。

### 4.4 Angular 不是在“模仿 Vue”，而是在补上自己长期缺失的那一层

Angular Signals 推出时，社区里一个很常见的反应是：

> 这不就是 Vue / Solid 早就有的东西吗？

这个观察半对半错。

对的部分在于：Signals 确实属于一条已经被 Vue、Solid、Preact 等生态验证过的技术路线。

错的部分在于：Angular 不是简单照搬某个 API，而是在用自己的渲染器、view 模型、变更检测体系重构一套更细粒度的状态传播基础设施。

Vue 的背景问题是“如何让对象状态自然地变成响应式”。

Angular 的背景问题是“如何从一个依赖 Zone.js 的全局检查框架，演进到精确、细粒度、可 zoneless 的更新模型”。

这两个出发点不同，但最后走向相似抽象，是因为问题最终收敛到了同一个数学对象：**依赖图**。

---

## 五、`ref()`、`signal()`、`createSignal()`：它们究竟同构在哪里

### 5.1 表面 API 不同，核心角色却几乎一致

先看三套最常见的 API：

| 角色         | Vue             | Angular      | Solid.js         |
| ------------ | --------------- | ------------ | ---------------- |
| 可写状态单元 | `ref()`         | `signal()`   | `createSignal()` |
| 派生值       | `computed()`    | `computed()` | `createMemo()`   |
| 副作用       | `watchEffect()` | `effect()`   | `createEffect()` |

如果把命名去掉，它们其实都在表达三类节点：

1. source node：手工写入的基础状态
2. derived node：基于其他状态计算出的缓存值
3. effect node：不产出新状态，只把变化投射到外部世界

这三类节点，正好对应我们前面讲的统一模型。

### 5.2 一个最小例子，就足够看清统一抽象

下面用同一个例子分别写三遍：

```typescript
// Vue
const count = ref(0);
const double = computed(() => count.value * 2);
watchEffect(() => {
  console.log(double.value);
});
```

```typescript
// Angular
const count = signal(0);
const double = computed(() => count() * 2);
effect(() => {
  console.log(double());
});
```

```typescript
// Solid
const [count, setCount] = createSignal(0);
const double = createMemo(() => count() * 2);
createEffect(() => {
  console.log(double());
});
```

这三段代码里，真正重要的不是读写语法，而是：

- `double` 不自己维护依赖列表
- effect 不手动订阅 `double`
- 当 `count` 变化后，`double` 不一定立刻重算，但它一定失效
- effect 不一定同步执行，但最终会在合适时机看见一致的新值

换句话说，它们共享的是**自动追踪 + 有缓存的派生节点 + 调度化的副作用**。

### 5.3 真正的差异，发生在边界条件与宿主集成层

这些框架真正不同的地方，主要不在 state/computed/effect 这三个基本角色，而在以下几层：

1. **读写语法**
   Vue 偏 `.value`，Angular 和 Solid 偏 getter function。
2. **只读/可写分离**
   Angular 在类型与 API 边界上更强调 `WritableSignal` 与只读 signal 的区分。
3. **生命周期绑定**
   Angular 的 effect 生命周期天然和 DI / `DestroyRef` / 组件上下文绑定得更紧。
4. **模板集成方式**
   Vue 倾向 template compiler + reactive render effect；Angular 倾向 signal read 与 view marking 集成；Solid 倾向极细粒度 DOM 级响应更新。
5. **调度承诺**
   不同框架对 effect 时机、批处理边界、渲染刷新时机的承诺强度并不相同。

所以，一个更准确的说法是：

> 它们共享的是响应式图模型，不共享全部宿主层语义。

---

## 六、Pull vs Push：为什么现代 Signals 几乎都不是纯粹的一边

### 6.1 先澄清一个常见误解

谈 Signals 时，经常有人会说：

- 某些框架是 push-based
- 某些框架是 pull-based
- Angular 更 eager
- Preact 更 lazy

这种说法如果不分层，会非常容易误导。

因为“push 还是 pull”，至少要分三层看：

1. **写入后的失效传播** 是 push 还是 pull？
2. **computed 的重新求值** 是 push 还是 pull？
3. **effect / render 的执行时机** 是 push 还是 pull，或者是调度驱动？

不把这三层分开，讨论很容易变成“术语正确，理解错误”。

### 6.2 `computed` 在 Angular 官方语义里仍然是 lazy 的

这一点必须说得非常明确。

Angular 官方文档写得很直白：`computed` 是 **lazily evaluated and memoized**。

也就是说：

- 依赖变了，`computed` 的缓存会失效
- 但不会因为依赖一变就立即重新执行计算函数
- 真正的计算发生在下次有人读取它时

这和 TC39 proposal 对 `Computed` 的方向其实非常一致：

- 写入时同步传播脏信息
- 读取时拉取最新值

所以如果把“Angular 选择 eager evaluation”理解为“Angular 的 computed 本身是 eager 的”，那是不准确的。

### 6.3 真正更主动的，是 invalidation 和 scheduling，而不是求值本身

Angular 和其他现代 Signals 方案的差异，更合理的比较点是：

- 依赖变更后，系统是否同步把脏标记往下游推送
- effect 是否由框架统一调度
- 模板刷新是否作为框架调度边界的一部分

Angular RFC 在 effect scheduling 上刻意不给过强时序承诺，这背后反映的是一个明确取向：

> 框架要保留 effect 与渲染整合的调度权，而不是把所有响应式时序语义都暴露给应用层。

这对 Angular 是很合理的，因为 Angular 不是独立的 signals runtime，它是一个大型 UI 框架。

它必须考虑：

- view 刷新时机
- 生命周期一致性
- zoneless 兼容
- 现有组件模型迁移

因此 Angular 的工程重点不是“让 `computed` 尽可能早执行”，而是“让状态图足够精确，同时让框架保留调度整合能力”。

### 6.4 Preact Signals 提醒我们：懒求值真正省下的是无意义工作

Preact Signals 官方文章把一个观点讲得非常好：Signals 的关键收益之一，是 **lazy by default** 和 **optimal updates**。

这意味着：

- 没人读的派生值不需要白算
- 值没真正变化的链路不用继续更新
- 更新成本应该跟状态图复杂度相关，而不是跟组件树大小绑定

这恰好说明现代 Signals 不是“越 eager 越先进”，而是“越能精确推迟无意义工作越先进”。

因此一个更准确的总结是：

```text
现代 Signals 通常是：
写入时 push invalidation
读取时 pull recomputation
副作用由框架或 runtime 调度
```

TC39 proposal 甚至直接把这种模式称作 **push-pull construction**。

### 6.5 为什么不能纯 push

如果完全 push：

- 每次写入都立刻重算全部下游
- 很容易重复计算
- 很难避免中间态
- effect 与 DOM 写入容易过度频繁

如果完全 pull：

- 又无法及时知道哪些下游可能已过期
- effect 很难正确被调度
- 依赖图上的“谁需要未来被处理”会变得不透明

所以现代设计最终都落在中间：

- push 负责传播“你可能脏了”
- pull 负责“现在真的有人要读你，那你再算”
- 调度层负责“副作用什么时候做最划算”

这不是折中妥协，而是工程上最稳的分工。

---

## 七、为什么 glitch-free 如此重要：从 diamond problem 说起

### 7.1 先看最小的 diamond

```typescript
const price = signal(100);
const quantity = signal(2);

const subtotal = computed(() => price() * quantity());
const tax = computed(() => subtotal() * 0.1);
const summary = computed(() => `${subtotal()} / ${tax()}`);
```

现在把图改成更典型的菱形：

```typescript
const count = signal(1);
const doubled = computed(() => count() * 2);
const tripled = computed(() => count() * 3);
const total = computed(() => doubled() + tripled());
```

当 `count` 从 `1` 变为 `2` 时，`total` 的正确值应该从 `5` 变到 `10`。

问题在于，如果采用 naive eager push，可能会出现下面的过程：

1. `doubled` 先更新为 `4`
2. `total` 被触发一次，读到 `4 + 3 = 7`
3. `tripled` 再更新为 `6`
4. `total` 再被触发一次，读到 `4 + 6 = 10`

用户虽然最终看到正确结果，但系统暴露过一个中间态 `7`。这就是 glitch。

### 7.2 现代 Signals 系统的目标，是“最少计算 + 不暴露中间态”

Angular RFC 明确把 glitch-free 作为设计目标之一。TC39 proposal 也把它写进 core features。

这意味着两个约束要同时成立：

1. 不要重复跑没必要的计算
2. 不要让任何 consumer 观察到不一致图状态

这通常要求系统具备：

- 脏/检查中/干净等状态
- 对依赖图的有序重算策略
- effect 不直接在传播阶段随手执行

从抽象上讲，现代 signal runtime 更像一个小型增量计算引擎，而不是“状态变化时触发回调”的升级版事件系统。

这也是它和 observable / pub-sub 最根本的区别之一。

### 7.3 Signals 不是流，而是“当前值单元”

TC39 proposal 对这个问题讲得很透：Signals 是 lossy 的。

也就是说，如果你连续写两次：

```typescript
count.set(1);
count.set(2);
```

系统的目标不是保证所有中间值都被 effect 看见，而是保证“当前图状态一致”。

这正是它和 RxJS/Observable 的边界：

- Observable 更像时间序列
- Signal 更像带依赖图的当前值寄存器

理解这点之后，你就不会再把 Signals 误用成“轻量版流”。

---

## 八、TC39 Signals Proposal：标准化的不是框架 API，而是底层语义

### 8.1 为什么 TC39 会开始讨论 Signals

Signals proposal 的背景非常值得注意。

它不是某个单一框架试图把自己的 API 推成标准，而是多个框架作者在过去十多年响应式实践之后，开始尝试抽出一个共识层。

截至 2026 年 5 月，TC39 Signals Proposal 处于 **Stage 1**。它的 README 非常明确：

- 目标是让不同框架能共享底层 reactive model
- 重点是统一 signal graph 和 auto-tracking semantics
- 不是为普通应用开发者提供最终形态的统一 UI API

这点非常关键。

Signals 标准化要解决的，不是“所有人都叫 `.value` 还是 `()`”，而是：

- 一个 state signal 应该有什么语义
- 一个 computed 应该怎样 lazy、cache、glitch-free
- framework-level effect 应该建立在怎样的 watcher primitive 上

### 8.2 Proposal 中最有意思的三层 API

TC39 proposal 的 API 可以粗略分成三层：

| 层级     | 代表 API                | 作用                                     |
| -------- | ----------------------- | ---------------------------------------- |
| 基础状态 | `Signal.State`          | 可写状态单元                             |
| 派生状态 | `Signal.Computed`       | lazy、memoized、glitch-free 的派生值     |
| 调度基元 | `Signal.subtle.Watcher` | 为框架实现 effect/scheduler 提供底层钩子 |

一个最重要的设计决定是：**proposal 没有直接把 `effect()` 作为语言标准的一部分。**

这并不是缺失，而是克制。

原因很简单：effect 从来不只是“依赖变化后执行函数”这么简单，它天然绑定：

- 调度时机
- 资源清理
- 生命周期
- 渲染系统

这些都明显属于框架层，而不是语言层。

### 8.3 Proposal 其实把我们前面的统一模型写成了语言草图

如果用本文的三阶段去看 TC39 proposal，会发现它几乎是逐层对应的：

1. **依赖追踪**
   `Computed.get()` 在运行时追踪读取到的 sources。
2. **变化传播**
   `State.set()` 会同步把 sinks 标记为 dirty/checked/pending。
3. **副作用调度**
   `Watcher` 的 `notify` 只负责通知，真正 effect 何时读、何时重跑，由框架自己决定。

这就是为什么我认为这个 proposal 的真正价值，不在 API 漂不漂亮，而在它第一次把“Signals 的共同语义”作为 JavaScript 语言层议题正式展开。

### 8.4 Proposal 对前端框架意味着什么

如果 Signals 最终成为语言内建，框架层至少有三类收益：

1. **共享语义基础**
   不同框架不必各自维护一套完全独立的 auto-tracking 语义。
2. **更好的互操作**
   跨框架共享模型、工具、devtools 将更现实。
3. **更低的重复实现成本**
   框架可以把更多精力放到调度、渲染、ownership、SSR/hydration 等高层问题。

但同时也要看到它的边界：

> Signals 就算进入语言，也不会把框架“消灭”成只剩模板语法。

因为框架真正难的部分仍然包括：

- component lifecycle
- rendering scheduler
- ownership / cleanup
- async resources
- SSR / hydration / resumability

TC39 proposal 只是把公共底盘变标准，不是替代整辆车。

---

## 九、如果 Signals 成为原生特性，Vue、Angular、React 会怎样变化

### 9.1 Vue：对象响应式仍在，但底层 signal graph 可能更轻、更统一

Vue 不太可能放弃 `reactive()` 这种基于 Proxy 的高层开发体验，因为它非常符合 Vue 的 API 哲学。

但如果底层 Signals 语义成为标准，Vue 的潜在简化路径会很明确：

- 用原生 signal primitive 承载更底层的 cell
- 让 `ref()` / `computed()` / `watchEffect()` 更像标准语义上的包装层
- 减少框架私有响应式运行时在边界场景上的维护负担

换句话说，Vue 很可能保留今天的高层 ergonomics，但把核心 graph semantics 尽量建立在标准基础上。

### 9.2 Angular：收益可能最直接，因为它本来就在重建底层反应性基础设施

Angular Signals 的战略价值，本来就不是单个 API，而是为整个 framework reactivity 打底。

所以如果原生 Signals 可用，Angular 可能是收益最直接的框架之一：

- 状态图的基础语义可下沉到语言层
- 对 framework-private reactive graph 的维护压力下降
- zoneless、signal inputs、resources、view marking 等高层能力可以更专注于框架宿主集成

但 Angular 仍然会保留大量框架特有能力，因为它的核心竞争力不只是“有个 signal runtime”，而是“把它和模板、视图、DI、生命周期、编译器绑定成一体”。

### 9.3 React：不会自动变成“Signal 框架”，但会获得新的共享基础设施可能性

React 当前的设计重心并不在 fine-grained signal graph，而在 component tree、scheduler、concurrent rendering、compiler 等层面。

因此即便 Signals 成为语言特性，也不意味着 React 会立刻改成 Vue/Angular/Solid 那种写法。

更现实的可能是：

- 第三方状态库更容易基于标准 signal primitive 实现
- React compiler / store integration 有了更统一的反应性底层
- React 自身是否采纳，仍取决于其调度和渲染模型的整体战略

所以我们不该把 Signals 标准化理解为“所有框架会变得一模一样”。

更准确的说法是：**它们会共享更接近的底层语义，但继续保留不同的宿主层哲学。**

---

## 十、结语：响应式系统真正统一的，不是 API，而是世界观

如果回头看过去十多年主流前端框架的演进，会发现一个很有意思的现象：

- Vue 从对象属性拦截，逐步走向显式状态单元
- Angular 从 Zone.js 驱动的全局检查，走向 signal graph 驱动的细粒度更新
- Solid、Preact 等则更早把 signal cell 作为核心抽象
- TC39 开始尝试把这套共同语义抽到语言层

这不是巧合。

它说明行业正在逐步形成一个共识：

> 一个现代 UI 框架，最终都需要一种能够显式表达依赖、精确传播失效、并把副作用调度与状态计算解耦的反应性基础设施。

这套基础设施在 Vue 世界里叫 Reactivity，在 Angular 世界里叫 Signals，在其他地方也许有别的名字。

但它们共享的核心世界观已经越来越清晰：

- 状态不是随处可变的普通变量
- 派生值不是手工维护的缓存
- 更新也不应该依赖整个组件树的重复遍历

而应该由一张持续存在的依赖图来承担“谁影响谁”这件事。

理解这一点之后，再看 `ref()`、`signal()`、`createSignal()`，你就不会把它们当成“不同框架各写各的状态 API”。

你会把它们看成同一类思想在不同宿主环境中的实现：

**让数据变化本身，成为程序控制流的一部分。**

这才是 Signals 真正值得讨论的地方。

## 延伸阅读

- [Vue.js 深入响应式原理](/posts/vue-analysis-responsive)
- [Vue 3 的开发进展](/posts/translate-making-vue3)
- [Vue 3 六年回顾：从革命性重写到生态成熟，2020-2026 发生了什么？](/posts/vue3-six-years-retrospective)
- [Angular Zone.js 解析](/posts/angular-zone)
- [Zone.js 谢幕，Signals 登场：Angular 17-19 变更检测完全指南](/posts/angular-signals-zoneless)
- [Angular 19-21 新特性详解](/posts/angular-features-19-to-21)

## 参考

- [Angular Signals 官方文档](https://angular.dev/guide/signals)
- [Angular Signals RFC 总览](https://github.com/angular/angular/discussions/49685)
- [Angular Signals API RFC](https://github.com/angular/angular/discussions/49683)
- [TC39 JavaScript Signals Proposal](https://github.com/tc39/proposal-signals)
- [Introducing Signals - Preact](https://preactjs.com/blog/introducing-signals/)
- [What is Reactivity?](https://www.pzuraq.com/blog/what-is-reactivity)
