---
pubDatetime: 2019-08-15T00:00:00Z
title: "Vue 实例挂载的实现"
slug: vue-analysis-mounted
featured: false
draft: false
tags:
  - vue
description: "Vue中我们是通过$mount实例方法去挂载vm的，$mount方法在多个文件中都有定义，如 ```js $mount src/platform/web/entry-runtime-with-compiler.js"
---

# Vue实例挂载的实现

Vue中我们是通过$mount实例方法去挂载vm的，$mount方法在多个文件中都有定义，如

## 文件路径

```js
$mount
src/platform/web/entry-runtime-with-compiler.js

src/platform/web/runtime/index.js

mountComponent
src/core/instance/lifecycle.js
```

## 总结

跟着大神的脚步去探险，核心方法：

```
vm._render()

vm._update()
```
