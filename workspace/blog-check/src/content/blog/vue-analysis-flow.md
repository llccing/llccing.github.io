---
pubDatetime: 2019-07-01T00:00:00Z
title: "Vue.js 技术揭秘 - Flow"
slug: vue-analysis-flow
featured: false
draft: false
tags:
  - vue
description: "Flow是Facebook出品的JavaScript静态类型检查工具，Vue.js的源码利用了Flow做静态类型检查，当然新版的Vue.js中使用了TypeScript来做这个事情。"
---

# Flow

Flow是Facebook出品的JavaScript静态类型检查工具，Vue.js的源码利用了Flow做静态类型检查，当然新版的Vue.js中使用了TypeScript来做这个事情。

## Flow的工作方式

- 类型推断
- 类型注释

## Flow在Vue.js源码中的应用

flow目录

```js
flow |
  --compiler.js |
  --component.js |
  (--global - api.js) |
  --modules.js |
  --options.js |
  --ssr.js |
  --vnode.js |
  --weex.js;
```
