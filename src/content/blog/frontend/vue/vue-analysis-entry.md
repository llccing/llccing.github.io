---
pubDatetime: 2019-07-22T00:00:00Z
title: "Vue.js 从入口开始"
slug: vue-analysis-entry
featured: false
draft: false
tags:
  - vue
description: "``` src/platforms/web/entry-runtime-with-compiler.js src/platforms/web/runtime/index.js"
---

# 从入口开始

## 重要文件路径

```
src/platforms/web/entry-runtime-with-compiler.js

src/platforms/web/runtime/index.js

src/core/index.js

src/core/instance/index.js

src/core/global-api/index.js


```

## 总结

    它本质上就是一个用 Function 实现的 Class，然后它的原型 prototype 以及它本身都扩展了一系列的方法和属性
