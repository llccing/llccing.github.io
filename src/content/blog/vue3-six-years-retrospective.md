---
pubDatetime: 2026-05-01T16:00:00Z
title: Vue 3 六年回望：从 2020 年的激进 RFC 到 2026 年的稳健生态
slug: vue3-six-years-retrospective
featured: false
draft: false
tags:
  - vue3
  - pinia
  - nuxt
  - frontend
description: Vue 3 从 2020 年发布到 2026 年已走过六年。本文回顾 Vue 3 的设计决策、生态演进、Vue 2 EOL 的落幕，以及 2026 年 Vue 生态的现实选型建议。
---

## 前言

2020 年，我翻译了一篇关于 Vue 3 设计哲学的文章，那时 Vue 3 Beta 刚刚发布，Composition API 让一部分人兴奋，让另一部分人困惑。Evan You 在 RFC 中描述的愿景——更好的 TypeScript 支持、更灵活的逻辑复用、更小的包体积——看起来很美好，但落地有多顺利还是个未知数。

六年后，Vue 3 已经稳健运行，Pinia 基本取代了 Vuex 在新项目中的地位，Nuxt 3 也成为 Vue 全栈实践里的主流选项之一，Vue 2 在 2023 年底正式 EOL。是时候做一次全面回望了。

---

## 一、2020 年的 Vue 3 愿景与现实

### 1.1 当时承诺的核心特性

**Composition API**：把逻辑按关注点组织，而不是按选项类型（data/methods/computed）分散：

```typescript
// Options API（Vue 2 风格）
export default {
  data() {
    return { count: 0, mouseX: 0, mouseY: 0 };
  },
  computed: {
    double() {
      return this.count * 2;
    },
  },
  methods: {
    increment() {
      this.count++;
    },
    onMouseMove(e) {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    },
  },
  mounted() {
    window.addEventListener("mousemove", this.onMouseMove);
  },
  unmounted() {
    window.removeEventListener("mousemove", this.onMouseMove);
  },
};
```

```typescript
// Composition API（Vue 3）——相关逻辑聚合在一起
import { ref, computed, onMounted, onUnmounted } from "vue";

// 可提取为独立的 composable
function useMousePosition() {
  const x = ref(0);
  const y = ref(0);

  function onMove(e: MouseEvent) {
    x.value = e.clientX;
    y.value = e.clientY;
  }

  onMounted(() => window.addEventListener("mousemove", onMove));
  onUnmounted(() => window.removeEventListener("mousemove", onMove));

  return { x, y };
}

export default defineComponent({
  setup() {
    const count = ref(0);
    const double = computed(() => count.value * 2);
    const { x, y } = useMousePosition();

    return { count, double, x, y };
  },
});
```

### 1.2 过渡期的阵痛（2020-2022）

Vue 3 发布后的前两年并不顺利：

- **生态断层**：大量 Vue 2 插件不支持 Vue 3（Vuetify、Element UI 等）
- **Vuex 4 的尴尬**：Vuex 4 仅是"能用于 Vue 3"，并未解决 Vuex 3 的设计问题（`mapState`、`mapActions` 的繁琐，TypeScript 推断差）
- **文档缺失**：Vue Router 4、Vuex 4 的文档远落后于 Vue 3 本身
- **Options API vs Composition API**：社区争论不休，新手不知道该学哪个

### 1.3 破局点（2022-2023）

- **Pinia 成为官方推荐**（替代 Vuex）：2022 年 2 月
- **Vite 成为新项目默认脚手架**：`npm create vue@latest` 默认生成 Vite + Vue 3 + Pinia + Vue Router 4
- **Element Plus 稳定**、**Vuetify 3 发布**：生态补齐
- **`<script setup>` 成为事实标准**：极大降低了 Composition API 的书写成本

---

## 二、`<script setup>` 成为事实标准

`<script setup>` 是 Vue 3.2 引入的编译时语法糖，它让 Composition API 的写法变得和 Options API 一样简洁：

```vue
<!-- 使用 <script setup> —— 2026 年的标准写法 -->
<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const userStore = useUserStore();

const count = ref(0);
const doubled = computed(() => count.value * 2);

// defineProps、defineEmits 无需 import
const props = defineProps<{
  title: string;
  initialCount?: number;
}>();

const emit = defineEmits<{
  countChanged: [value: number];
}>();

function increment() {
  count.value++;
  emit("countChanged", count.value);
}
</script>

<template>
  <div>
    <h1>{{ props.title }}</h1>
    <p>Count: {{ count }} (×2 = {{ doubled }})</p>
    <button @click="increment">+1</button>
  </div>
</template>
```

相比"完整"的 Composition API 写法（需要 `setup()` 函数，需要 `return`），`<script setup>` 减少了大量样板代码。

### 2.1 与 Options API 的最终定论

官方文档的建议：

> 对于**生产应用**，推荐使用 Options API（如果不需要 TypeScript 深度集成）或基于 `<script setup>` 的 Composition API。
>
> 两者都是一等公民，不会被废弃。

实际社区走向：**多数新项目优先使用 `<script setup>`**，Options API 主要存在于：

- 遗留 Vue 2 迁移项目
- 偏向面向对象思维的团队
- 需要用 `this` 的特殊场景（Options API Mixin 改造中）

---

## 三、Pinia 取代 Vuex：状态管理的范式转移

### 3.1 Vuex 4 的根本问题

```typescript
// Vuex 4 的 TypeScript 体验（痛苦）
import { useStore } from "vuex";

const store = useStore();
// store.state 是 any，没有类型推断
const user = store.state.user; // 类型：any ❌

// 需要大量 namespace 前缀
store.commit("user/setName", "Alice");
store.dispatch("user/fetchProfile");
```

### 3.2 Pinia 的设计

```typescript
// stores/user.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { User } from "@/types";

export const useUserStore = defineStore("user", () => {
  // state
  const user = ref<User | null>(null);
  const isLoading = ref(false);

  // getters
  const isLoggedIn = computed(() => user.value !== null);
  const displayName = computed(() => user.value?.name ?? "游客");

  // actions
  async function fetchUser(id: string) {
    isLoading.value = true;
    try {
      user.value = await api.getUser(id);
    } finally {
      isLoading.value = false;
    }
  }

  function logout() {
    user.value = null;
  }

  return { user, isLoading, isLoggedIn, displayName, fetchUser, logout };
});
```

```vue
<!-- 组件中使用：完整的 TypeScript 类型推断 -->
<script setup lang="ts">
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

// userStore.user: User | null  ✅ 完整类型
// userStore.isLoggedIn: boolean  ✅
// userStore.fetchUser: (id: string) => Promise<void>  ✅
</script>
```

Pinia 的优势一目了然：

- **无 mutations**：直接修改 state（Proxy 追踪变化）
- **完整 TypeScript 推断**：无需额外类型标注
- **无 namespace**：每个 store 自成一体，按需导入
- **支持 Composition API 写法**（如上）和 Options 写法（类似 Vuex）
- **轻量**：比 Vuex 小得多

---

## 四、Vue 2 EOL：一个时代的落幕

2023 年 12 月 31 日，Vue 2 正式停止维护（End of Life）。

### 4.1 迁移难度评估

| 项目类型                   | 迁移难度    | 主要挑战                         |
| -------------------------- | ----------- | -------------------------------- |
| 小型个人项目               | ⭐ 低       | 主要是 Options → Composition API |
| 中型业务项目               | ⭐⭐ 中     | Vuex 3 → Pinia，Vue Router 3 → 4 |
| 大型企业项目（自研组件库） | ⭐⭐⭐⭐ 高 | 组件库全量升级，Mixin 重构       |
| 使用大量 Vue 2 专有插件    | ⭐⭐⭐ 中高 | 替换无 Vue 3 版本的插件          |

### 4.2 迁移策略

**渐进迁移**（推荐大型项目）：

```bash
# 安装 @vue/compat（Vue 3 兼容构建）
npm install vue@3 @vue/compat

# vue.config.js（Vue CLI）或 vite.config.ts
resolve: {
  alias: {
    vue: '@vue/compat'  // 拦截 vue 导入，使用兼容包
  }
}
```

`@vue/compat` 会在控制台输出迁移警告，提示哪些 API 在 Vue 3 中已变更，逐步修复后再切换到正式版。

---

## 五、Nuxt 3/4 作为 Vue 全栈标准

### 5.1 Nuxt 3 的核心变化

Nuxt 3（2022 年发布）相比 Nuxt 2 是全面重写：

| 特性     | Nuxt 2                | Nuxt 3                      |
| -------- | --------------------- | --------------------------- |
| Vue 版本 | Vue 2                 | Vue 3                       |
| 构建工具 | Webpack               | Vite                        |
| 服务端   | Express               | Nitro（H3）                 |
| 路由     | 基于文件              | 基于文件（增强）            |
| 数据获取 | `asyncData` + `fetch` | `useFetch` + `useAsyncData` |
| 状态管理 | Vuex 内置             | Pinia（推荐）               |

### 5.2 Nuxt 3 数据获取

```vue
<!-- pages/posts/[id].vue -->
<script setup lang="ts">
const route = useRoute();

// useFetch：自动处理 SSR hydration、重复数据获取去重
const {
  data: post,
  error,
  pending,
} = await useFetch<Post>(`/api/posts/${route.params.id}`, {
  // 缓存：相同 key 的请求只执行一次
  key: `post-${route.params.id}`,
});

// SEO
useSeoMeta({
  title: () => post.value?.title,
  ogTitle: () => post.value?.title,
  description: () => post.value?.summary,
});
</script>

<template>
  <div v-if="pending">Loading...</div>
  <article v-else-if="post">
    <h1>{{ post.title }}</h1>
    <div v-html="post.content" />
  </article>
</template>
```

### 5.3 Nuxt 4（2025）的主要变化

- **Nuxt Layers**：模块化应用，跨项目复用页面/组件/配置
- **改进的 App Router**：更细粒度的服务端/客户端渲染控制
- **Islands Architecture 稳定**：类似 Astro 的选择性 Hydration

---

## 六、Vue Vapor 模式：无虚拟 DOM 的探索

Vue Vapor 是 Vue 团队正在开发的无虚拟 DOM 渲染模式：

```
传统 Vue 渲染：
  <template> → 编译为 render 函数 → VNode 树 → DOM 操作

Vue Vapor：
  <template> → 编译为直接 DOM 操作代码（无 VNode）
```

**Vapor 的目标**：在高频更新场景（如大型列表、实时数据）下比 VDOM 方案快 2-4 倍。

```vue
<!-- 普通 Vue 组件（VDOM） -->
<template>
  <p>{{ count }}</p>
</template>

<!-- 编译为（Vapor 模式）-->
// 无 VNode，直接操作 DOM const p = createText(count.value) effect(() => {
setText(p, count.value) // count 变时直接更新文本节点 })
```

**2026 年现状**：Vapor 仍在 RFC 阶段，部分组件级别可用。不影响日常开发决策，但值得关注。

---

## 七、2026 年 Vue 生态地图

### 7.1 核心工具链

```
脚手架：  npm create vue@latest（Vite + Vue 3 + TypeScript）
状态：    Pinia
路由：    Vue Router 4
HTTP：   Axios / ofetch（Nuxt 推荐）
UI 库：  Element Plus / Vuetify 3 / Naive UI / Quasar
测试：   Vitest + Vue Test Utils
SSR/全栈：Nuxt 3/4
```

### 7.2 适用场景选型

| 场景                 | 推荐方案                            |
| -------------------- | ----------------------------------- |
| 后台管理系统         | Vite + Vue 3 + Element Plus + Pinia |
| ToC 应用（SEO 重要） | Nuxt 3                              |
| 组件库开发           | Vite + Vue 3 + VitePress（文档）    |
| 桌面应用             | Tauri + Vue 3                       |
| 移动端 H5            | Vue 3 + Vant 4                      |
| 小程序               | uni-app（Vue 3 模式）               |

---

## 总结

Vue 3 的六年走得并不轻松——早期的生态阵痛是真实的，但 2022 年后的 Vue 3 生态已经非常成熟稳健。

Composition API + `<script setup>` + Pinia 这套组合，在开发体验和类型安全上已经比肩甚至超越了 React Hooks 方案。Nuxt 3 则让 Vue 有了一个完整的全栈答案。

如果你的团队还在用 Vue 2，现在是迁移的好时机——Vue 2 已停止维护，而 Vue 3 的迁移路径已经相当清晰。

---

## 参考资料

- [Vue 3 官方文档](https://vuejs.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Nuxt 3 官方文档](https://nuxt.com/)
- [Vue 2 EOL 公告](https://v2.vuejs.org/eol/)
- [Vue Vapor RFC](https://github.com/vuejs/rfcs/discussions/576)
- [Vue 3 迁移指南](https://v3-migration.vuejs.org/)
- [State of Vue 2025](https://blog.vuejs.org/posts/state-of-vue-2025)
