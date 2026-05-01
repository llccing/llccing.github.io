---
pubDatetime: 2026-05-01T17:00:00Z
title: 2026 年 React 入门路线：抛弃 dva/umi，拥抱 React 19 + Vite + Ant Design 5
slug: react19-vite-antd5-starter
featured: false
draft: false
tags:
  - react
  - ant-design
  - vite
  - frontend
description: 2019 年的 CRA + dva + umi 方案早已过时。本文给出 2026 年 React 入门的正确路线：React 19 + Vite + Ant Design 5 + Zustand + React Router v7，配合完整的工程化配置。
---

## 前言

2019 年，我写过一篇 React + Ant Design 的入门教程，介绍了当时阿里系的标准方案：Create React App 脚手架 + dva（基于 Redux + redux-saga 的状态管理）+ umi（企业级路由框架）。

今天再看这篇文章，几乎每一个工具都已经过时：

- **CRA**：官方已不再维护，推荐迁移
- **dva**：停止活跃开发
- **umi 3**：已升级到 umi 4，但 umi 的门槛和耦合度始终是社区争议点
- **Redux + redux-saga**：被更轻量的方案大量替代
- **Ant Design 4**：已升级到 AntD 5，设计系统和 API 有重要变化

2026 年的 React 生态已经非常清晰，是时候重写这份入门路线了。

---

## 一、2019 年的方案哪里过时了

### 1.1 Create React App（CRA）

CRA 于 2016 年由 Facebook 发布，解决了"零配置启动 React 项目"的问题。但它的问题一直存在：

- **基于 Webpack，冷启动慢**（大项目 30-60 秒）
- **配置被封装**：想自定义必须 `eject`，一旦 eject 就再也回不去了
- **更新停滞**：2022 年后基本停止维护

React 官方文档在 2023 年彻底移除了 CRA 的推荐，改为推荐框架（Next.js、Remix）或 Vite。

### 1.2 dva / Redux / redux-saga

```typescript
// dva 的状态管理（2019 年）
const model = {
  namespace: "user",
  state: { list: [], loading: false },
  effects: {
    *fetchUsers({ payload }, { call, put }) {
      yield put({ type: "setLoading", payload: true });
      const data = yield call(api.getUsers, payload);
      yield put({ type: "setUsers", payload: data });
      yield put({ type: "setLoading", payload: false });
    },
  },
  reducers: {
    setUsers(state, { payload }) {
      return { ...state, list: payload };
    },
    setLoading(state, { payload }) {
      return { ...state, loading: payload };
    },
  },
};
```

这种写法需要理解：Generator 函数、Effect、Reducer、Action 四个层次，对于简单的数据请求来说过于复杂。

**2026 年的等价代码**（用 Zustand + TanStack Query）：

```typescript
// 服务器状态：TanStack Query 管理
const { data: users, isLoading } = useQuery({
  queryKey: ["users"],
  queryFn: api.getUsers,
});
// 三行替代了上面所有代码，还自带缓存、重新获取、错误处理
```

---

## 二、React 19 核心新特性

### 2.1 Server Components（RSC）

React Server Components 允许组件在服务器上运行，直接访问数据库，不向客户端发送 JS：

```tsx
// app/posts/page.tsx（Next.js App Router）
// 这是一个 Server Component——在服务器运行，不发送到客户端

import { db } from "@/lib/db";

// 直接查询数据库！不需要 API 路由
export default async function PostsPage() {
  const posts = await db.post.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

**与客户端组件的区别**：

```tsx
// 客户端组件：需要 'use client' 指令
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0); // 只有客户端组件能用 hooks
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

> **注意**：RSC 目前只在框架（Next.js App Router、Remix）中可用，纯 Vite SPA 项目暂不支持。

### 2.2 Actions（React 19 新增）

`useActionState` 和 `useFormStatus` 大幅简化了表单提交逻辑：

```tsx
"use client";
import { useActionState } from "react";

// Server Action（在服务器上运行的函数）
async function submitForm(prevState: any, formData: FormData) {
  "use server";
  const name = formData.get("name") as string;

  if (!name) return { error: "姓名不能为空" };

  await db.user.create({ data: { name } });
  return { success: true };
}

// 客户端组件使用 Server Action
export function ContactForm() {
  const [state, action, isPending] = useActionState(submitForm, null);

  return (
    <form action={action}>
      <input name="name" />
      {state?.error && <p className="error">{state.error}</p>}
      {state?.success && <p>提交成功！</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "提交中..." : "提交"}
      </button>
    </form>
  );
}
```

### 2.3 use() hook

`use()` 可以在组件中直接读取 Promise 或 Context，配合 Suspense 使用：

```tsx
import { use, Suspense } from "react";

// 在组件外创建 Promise
const userPromise = fetchUser(userId);

function UserProfile() {
  // use() 会在 Promise resolve 前"暂停"，触发最近的 Suspense
  const user = use(userPromise);
  return <div>{user.name}</div>;
}

// 父组件
function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile />
    </Suspense>
  );
}
```

---

## 三、2026 年推荐的完整技术栈

### 3.1 SPA（纯前端）技术栈

```
脚手架：   Vite
框架：     React 19
语言：     TypeScript 5.x
路由：     React Router v7
UI 库：   Ant Design 5
状态管理： Zustand（全局状态）+ TanStack Query（服务器状态）
HTTP：    Axios / ky
测试：    Vitest + React Testing Library
代码质量：ESLint 9（flat config）+ Prettier / Biome
```

### 3.2 全栈/SSR 技术栈

```
框架：     Next.js 15（App Router）
UI 库：   Ant Design 5
状态：     Zustand（仅客户端状态）+ TanStack Query（或直接 RSC）
ORM：     Prisma / Drizzle
```

---

## 四、Vite + React 19 + AntD 5 Starter 完整示例

### 4.1 项目初始化

```bash
# 创建项目
pnpm create vite my-app --template react-ts
cd my-app

# 安装核心依赖
pnpm add react-router-dom antd zustand @tanstack/react-query axios

# 安装开发依赖
pnpm add -D @types/react @types/react-dom eslint @typescript-eslint/parser
```

### 4.2 目录结构

```
src/
├── components/         # 通用 UI 组件
│   └── Layout/
├── pages/              # 页面组件
│   ├── Home.tsx
│   ├── Posts/
│   │   ├── index.tsx
│   │   └── PostDetail.tsx
│   └── Login.tsx
├── stores/             # Zustand stores
│   └── useAuthStore.ts
├── queries/            # TanStack Query hooks
│   └── usePosts.ts
├── api/               # API 请求函数
│   └── posts.ts
├── types/             # TypeScript 类型
│   └── index.ts
├── router.tsx         # 路由配置
└── main.tsx
```

### 4.3 路由配置（React Router v7）

```tsx
// src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/Layout";
import { HomePage } from "./pages/Home";
import { PostsPage } from "./pages/Posts";
import { PostDetailPage } from "./pages/Posts/PostDetail";
import { LoginPage } from "./pages/Login";
import { AuthGuard } from "./components/AuthGuard";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "posts",
        element: (
          <AuthGuard>
            <PostsPage />
          </AuthGuard>
        ),
      },
      {
        path: "posts/:id",
        element: (
          <AuthGuard>
            <PostDetailPage />
          </AuthGuard>
        ),
      },
    ],
  },
  { path: "/login", element: <LoginPage /> },
]);
```

### 4.4 Zustand 状态管理

```typescript
// src/stores/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      isAuthenticated: () => get().token !== null,
    }),
    {
      name: "auth-storage", // localStorage key
      partialize: state => ({ token: state.token }), // 只持久化 token
    }
  )
);
```

### 4.5 TanStack Query 数据获取

```typescript
// src/api/posts.ts
import axios from "axios";
import type { Post } from "@/types";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// 添加 token 到请求头
api.interceptors.request.use(config => {
  const token = localStorage.getItem("auth-storage")
    ? JSON.parse(localStorage.getItem("auth-storage")!).state?.token
    : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const postsApi = {
  getList: (page: number, pageSize: number) =>
    api
      .get<{ data: Post[]; total: number }>("/posts", {
        params: { page, pageSize },
      })
      .then(r => r.data),

  getById: (id: string) => api.get<Post>(`/posts/${id}`).then(r => r.data),

  create: (data: Omit<Post, "id" | "createdAt">) =>
    api.post<Post>("/posts", data).then(r => r.data),
};
```

```typescript
// src/queries/usePosts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsApi } from "@/api/posts";
import { message } from "antd";

export function usePostList(page: number, pageSize = 10) {
  return useQuery({
    queryKey: ["posts", page, pageSize],
    queryFn: () => postsApi.getList(page, pageSize),
    staleTime: 5 * 60 * 1000, // 5 分钟内不重新请求
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postsApi.create,
    onSuccess: () => {
      // 创建成功后让列表缓存失效，自动重新获取
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      message.success("创建成功");
    },
    onError: () => {
      message.error("创建失败，请重试");
    },
  });
}
```

### 4.6 Ant Design 5 使用

```tsx
// src/pages/Posts/index.tsx
import { Table, Button, Space, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { usePostList } from "@/queries/usePosts";
import type { Post } from "@/types";

export function PostsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePostList(page);

  const columns: ColumnsType<Post> = [
    {
      title: "标题",
      dataIndex: "title",
      render: (title, record) => <a href={`/posts/${record.id}`}>{title}</a>,
    },
    {
      title: "状态",
      dataIndex: "status",
      render: status => (
        <Tag color={status === "published" ? "green" : "orange"}>
          {status === "published" ? "已发布" : "草稿"}
        </Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      render: date => new Date(date).toLocaleDateString("zh-CN"),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}>
          新建文章
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={data?.data}
        loading={isLoading}
        rowKey="id"
        pagination={{
          current: page,
          total: data?.total,
          onChange: setPage,
        }}
      />
    </div>
  );
}
```

### 4.7 AntD 5 Design Token 定制

Ant Design 5 废弃了 Less 变量，改用 Design Token（CSS-in-JS + 主题系统）：

```tsx
// src/main.tsx
import { ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ConfigProvider
    locale={zhCN}
    theme={{
      token: {
        colorPrimary: "#1677ff", // 主题色
        borderRadius: 6,
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      },
      algorithm: theme.defaultAlgorithm, // 或 theme.darkAlgorithm
    }}
  >
    <RouterProvider router={router} />
  </ConfigProvider>
);
```

---

## 五、工程化配置

### 5.1 ESLint 9 + TypeScript

```javascript
// eslint.config.js（flat config）
import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tsParser },
    plugins: {
      "@typescript-eslint": typescript,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
];
```

### 5.2 路径别名

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 总结

| 2019 年方案      | 2026 年替代                   |
| ---------------- | ----------------------------- |
| Create React App | Vite                          |
| dva + redux-saga | Zustand + TanStack Query      |
| umi（路由框架）  | React Router v7（或 Next.js） |
| Ant Design 4     | Ant Design 5（Design Token）  |
| Less 主题变量    | ConfigProvider Design Token   |

迁移的核心是思维转变：放弃"一个框架包打天下"的 umi 思路，回归到"组合最好的单一职责工具"的方式。每个工具都做好自己的事：Vite 管构建，Zustand 管客户端状态，TanStack Query 管服务器状态，React Router 管路由。

---

## 参考资料

- [React 19 发布公告](https://react.dev/blog/2024/12/05/react-19)
- [Vite 官方文档](https://vite.dev/)
- [Zustand 官方文档](https://zustand.docs.pmnd.rs/)
- [TanStack Query 官方文档](https://tanstack.com/query/latest)
- [Ant Design 5 文档](https://ant.design/docs/react/introduce-cn)
- [React Router v7 文档](https://reactrouter.com/home)
- [Why I moved from Redux to Zustand](https://tkdodo.eu/blog/zustand-and-react-context)
