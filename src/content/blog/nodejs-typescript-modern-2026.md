---
pubDatetime: 2026-05-01T18:00:00Z
title: Node.js 工程化 2026：告别 ts-node，原生 TypeScript 运行时时代已到
slug: nodejs-typescript-modern-2026
featured: false
draft: false
tags:
  - nodejs
  - typescript
  - backend
  - tooling
description: Node.js 已内置 Type Stripping，可直接运行满足条件的 TypeScript 文件；ts-node 不再是唯一选择。本文讲解现代 Node.js 项目结构、内置 TS 支持与其局限、Bun/Deno 的现实评估，以及 tsup、Vitest、zod 的最佳实践。
---

## 前言

2019 年，我写过一篇 TypeScript + Node.js 的入门教程，介绍了 `ts-node` + `nodemon` + `tsc` 的经典三件套。当时这套组合是 Node.js + TypeScript 开发的标配。

从 Node.js 22 开始，官方引入了 Type Stripping 能力，可以直接运行一部分 TypeScript 文件（不需要 ts-node）。到 2026 年，这套能力已经进入稳定文档，但它仍然是“轻量运行时支持”，不是 `tsc` 的替代品。与此同时，Bun 和 Deno 2 也在生产环境中获得了越来越多的采用。

这篇文章重新梳理 2026 年 Node.js 工程化的全貌。

---

## 一、2019 年的标准配置为什么过时了

### 1.1 ts-node 的问题

```bash
# 2019 年的开发启动命令
npx ts-node-dev --respawn --transpile-only src/index.ts
```

```json
// package.json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "devDependencies": {
    "typescript": "^4.x",
    "ts-node": "^10.x",
    "ts-node-dev": "^2.x",
    "@types/node": "^16.x"
  }
}
```

问题：

- **ts-node 冷启动慢**：大型项目每次重启要 2-5 秒（需要转译所有文件）
- **`--transpile-only` 是权宜之计**：跳过类型检查才能快，但这意味着类型错误运行时才暴露
- **复杂的 ESM 配置**：ts-node + ESM + `"type": "module"` 的组合配置混乱，坑极多
- **额外依赖**：ts-node、ts-node-dev 都是需要维护的额外依赖

### 1.2 CommonJS 的历史包袱

Node.js 早期只有 CommonJS（`require()`），而 JavaScript 标准是 ES Module（`import`）。这造成了长达多年的分裂：

```javascript
// CJS 风格（旧）
const fs = require("fs");
const { join } = require("path");
module.exports = { myFunction };

// ESM 风格（现代）
import { readFile } from "fs/promises";
import { join } from "path";
export { myFunction };
```

2026 年的建议：**新项目全部使用 ESM**，在 `package.json` 中设置 `"type": "module"`。

---

## 二、Node.js 22+ 原生 TypeScript 支持

### 2.1 如何使用

Node.js 在 v22.6 引入 Type Stripping。早期版本需要显式加标志；到 2026 年的当前文档，默认即可运行“可擦除语法”的 `.ts` 文件：

```bash
# 早期 22.x（特性刚引入时）
node --experimental-strip-types src/index.ts

# 当前稳定文档口径（默认启用 type stripping）
node src/index.ts
```

不需要 ts-node，不需要编译步骤，直接运行！

```typescript
// src/index.ts
import { readFile } from "fs/promises";
import { join } from "path";

interface Config {
  port: number;
  host: string;
}

const config: Config = {
  port: 3000,
  host: "localhost",
};

const data = await readFile(join(import.meta.dirname, "data.json"), "utf-8");
console.log(`Server starting on ${config.host}:${config.port}`);
```

### 2.2 实现原理：Type Stripping

Node.js 的原生 TS 支持**不进行类型检查**，只做"类型剥离"（Type Stripping）：把 TypeScript 语法中的类型注解直接删掉，得到纯 JavaScript。

```typescript
// 输入（TypeScript）
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// 经过 type stripping（删除类型注解）
function greet(name) {
  return `Hello, ${name}!`;
}
// 注意：保留空格以保持行列号一致（便于调试）
```

### 2.3 局限性

原生 TS 支持**不支持**以下 TypeScript 语法（因为它们不是纯粹的类型，需要代码转换）：

```typescript
// ❌ 不支持：enum（需要 tsc 转换）
enum Direction {
  Up,
  Down,
}

// ✅ 替代方案：const enum 或对象
const Direction = {
  Up: "Up",
  Down: "Down",
} as const;
type Direction = (typeof Direction)[keyof typeof Direction];

// ❌ 不支持：experimentalDecorators（旧装饰器）
@Injectable()
class MyService {}

// ✅ TC39 新装饰器（Stage 3）可以用，需要确认 Node 版本
```

### 2.4 配合 `--watch` 做开发时热重载

```bash
# 内置 watch 模式（Node.js 18+）
node --experimental-strip-types --watch src/index.ts
```

或者在 `package.json`：

```json
{
  "scripts": {
    "dev": "node --experimental-strip-types --watch src/index.ts",
    "typecheck": "tsc --noEmit",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

**最佳实践**：开发时用 Node.js 原生运行（快速），CI 中单独跑 `tsc --noEmit` 做类型检查，生产构建用 `tsc` 或 `tsup`。

---

## 三、Bun 与 Deno 2 的现实评估

### 3.1 Bun

[Bun](https://bun.sh/) 是用 Zig 写的 JS/TS 运行时，内置 TypeScript 支持、包管理器、测试运行器、打包器。

**实测性能优势**：

```
任务：启动一个 Express 风格的 HTTP 服务器

Node.js 22：冷启动 ~80ms
Bun：冷启动 ~10ms

包安装速度（100 个依赖）：
npm install：~15 秒
pnpm install：~8 秒
bun install：~2 秒
```

**Bun 的适用场景**（2026 年）：

- 脚本工具、CLI 工具（速度优势明显）
- 边缘计算函数（冷启动时间关键）
- 团队愿意接受 Bun 特有 API 的项目

**Bun 的谨慎场景**：

- 依赖大量 Node.js 原生模块（N-API）的项目
- 需要精确控制内存的高负载服务
- 团队规模大、运维基础设施已标准化 Node.js

### 3.2 Deno 2

[Deno 2](https://deno.com/blog/v2.0) 于 2024 年发布，重大改变是**完整兼容 npm 包**：

```typescript
// Deno 2 可以直接使用 npm 包（不需要 node_modules）
import express from "npm:express@^4";
import { z } from "npm:zod";

const app = express();
app.get("/", (req, res) => res.send("Hello from Deno 2!"));
app.listen(3000);
```

Deno 2 原生支持 TypeScript，内置权限系统（网络、文件系统、环境变量都需要显式授权）。

**Deno 的最佳场景**：

- 安全敏感的脚本（权限模型天然沙箱）
- Deno Deploy（Deno 的边缘函数平台）
- 从零开始的新项目，团队接受 Deno 工具链

---

## 四、现代 Node.js 项目结构

### 4.1 推荐目录结构

```
my-node-app/
├── src/
│   ├── index.ts          # 入口
│   ├── config/
│   │   └── index.ts      # 环境变量验证（使用 zod）
│   ├── routes/           # 路由/控制器
│   ├── services/         # 业务逻辑
│   ├── repositories/     # 数据库访问
│   ├── middleware/        # 中间件
│   └── types/            # 类型定义
├── tests/
│   ├── unit/
│   └── integration/
├── dist/                 # 编译输出（gitignore）
├── package.json
└── tsconfig.json
```

### 4.2 package.json（ESM 优先）

```json
{
  "name": "my-node-app",
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "node --experimental-strip-types --watch src/index.ts",
    "typecheck": "tsc --noEmit",
    "build": "tsup src/index.ts --format esm --dts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### 4.3 tsconfig.json（2026 年推荐配置）

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext", // ESM + 精确的模块解析
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true, // 访问数组元素时提示可能 undefined
    "exactOptionalPropertyTypes": true,
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 五、构建发包：tsup

[tsup](https://tsup.egoist.dev/) 是基于 esbuild 的库打包工具，专为 TypeScript 库发包设计。

```bash
pnpm add -D tsup
```

```typescript
// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"], // 同时输出 ESM 和 CJS（兼容老旧消费者）
  dts: true, // 生成 .d.ts 类型文件
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
```

```bash
pnpm tsup
# 输出：
# dist/index.js      (ESM)
# dist/index.cjs     (CommonJS)
# dist/index.d.ts    (类型声明)
# dist/index.d.cts   (CJS 类型声明)
```

---

## 六、测试：Node.js 内置 Test Runner vs Vitest

### 6.1 Node.js 内置 `--test`

Node.js 18+ 内置了测试运行器，无需额外依赖：

```typescript
// tests/greet.test.ts
import { test, describe, assert } from "node:test";
import { greet } from "../src/greet.js";

describe("greet()", () => {
  test("returns greeting with name", () => {
    assert.strictEqual(greet("Alice"), "Hello, Alice!");
  });

  test("handles empty name", () => {
    assert.throws(() => greet(""), /name cannot be empty/);
  });
});
```

```bash
node --experimental-strip-types --test tests/**/*.test.ts
```

**适用**：简单脚本，不想引入额外依赖的场景。

### 6.2 Vitest（推荐）

[Vitest](https://vitest.dev/) 与 Vite 同出一源，测试体验一流：

```typescript
// tests/greet.test.ts
import { describe, it, expect, vi } from "vitest";
import { greet } from "../src/greet.js";

describe("greet()", () => {
  it("returns greeting with name", () => {
    expect(greet("Alice")).toBe("Hello, Alice!");
  });

  it("handles empty name", () => {
    expect(() => greet("")).toThrow("name cannot be empty");
  });
});
```

```json
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    }
  }
})
```

**Vitest 的优势**：

- Jest 兼容 API（迁移成本低）
- 原生 ESM 支持（无需额外配置）
- 出色的 Watch 模式（只重跑受影响的测试）
- 内置覆盖率（v8 provider，无需 babel 插件）

---

## 七、类型安全边界：zod 做运行时校验

TypeScript 的类型只在编译时有效，运行时数据（HTTP 请求体、环境变量、数据库结果）可能与类型不符。`zod` 解决这个问题：

### 7.1 环境变量验证

```typescript
// src/config/index.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
});

// 启动时验证，缺少必要变量立即报错
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
// env.PORT: number  ✅ 类型正确
// env.DATABASE_URL: string  ✅
```

### 7.2 API 请求体验证

```typescript
// src/routes/users.ts
import { z } from "zod";
import type { Request, Response } from "express";

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
});

type CreateUserInput = z.infer<typeof createUserSchema>;

export async function createUser(req: Request, res: Response) {
  const result = createUserSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: result.error.flatten().fieldErrors,
    });
  }

  const data: CreateUserInput = result.data; // 类型安全！
  // 后续操作保证 data 的结构是正确的
}
```

### 7.3 valibot：更轻量的替代

如果包体积敏感，[valibot](https://valibot.dev/) 是 zod 的轻量替代（tree-shakable，实际使用部分只有几 KB）：

```typescript
import { object, string, email, minLength, parse } from "valibot";

const UserSchema = object({
  name: string([minLength(1)]),
  email: string([email()]),
});

const user = parse(UserSchema, req.body);
```

---

## 八、性能调优简介

### 8.1 Node.js 内置 `--prof`

```bash
# 生成 V8 性能分析文件
node --prof dist/server.js

# 可视化分析（负载测试后）
node --prof-process isolate-*.log > profile.txt
```

### 8.2 AsyncLocalStorage 替代 cls-hooked

2019 年流行的 `cls-hooked`（用于跨异步传递上下文，如请求 ID）已被 Node.js 内置的 `AsyncLocalStorage` 替代：

```typescript
import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  requestId: string;
  userId?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

// 中间件：设置上下文
app.use((req, res, next) => {
  const context: RequestContext = {
    requestId: crypto.randomUUID(),
  };
  asyncLocalStorage.run(context, next);
});

// 任意深度的函数中获取上下文，无需传参
function someDeepFunction() {
  const ctx = asyncLocalStorage.getStore();
  console.log(`[${ctx?.requestId}] Processing...`);
}
```

---

## 总结

| 2019 年方案        | 2026 年替代                               |
| ------------------ | ----------------------------------------- |
| ts-node            | Node.js 原生 `--experimental-strip-types` |
| ts-node-dev        | `node --watch --experimental-strip-types` |
| `tsc` 发包         | tsup                                      |
| Jest + ts-jest     | Vitest                                    |
| 手动环境变量       | zod 环境变量 schema                       |
| cls-hooked         | AsyncLocalStorage（内置）                 |
| CommonJS + require | ESM + import（`"type": "module"`）        |

最大的变化是：Node.js 生态终于有了稳定的 ESM 支持和原生 TS 运行，不再需要大量的适配工具。工具链变简单了，项目结构可以更清晰了。

---

## 参考资料

- [Node.js 22 TypeScript 原生支持](https://nodejs.org/en/blog/release/v22.6.0)
- [Bun 官方文档](https://bun.sh/docs)
- [Deno 2 发布公告](https://deno.com/blog/v2.0)
- [tsup 官方文档](https://tsup.egoist.dev/)
- [Vitest 官方文档](https://vitest.dev/)
- [zod 官方文档](https://zod.dev/)
- [valibot 官方文档](https://valibot.dev/)
- [Node.js ESM 最佳实践](https://nodejs.org/api/esm.html)
