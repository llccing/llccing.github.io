---
pubDatetime: 2019-08-01T00:00:00Z
title: "Vue.js 数据驱动"
slug: vue-analysis-data-driven
featured: false
draft: false
tags:
  - vue
description: "Vue.js的核心思想是数据驱动。 视图是由数据驱动生成的，我们对视图的修改，不会直接操作DOM，而是通过修改数据。 - 简化代码量 - 利于维护 简洁的模板语法来声明式的将数据渲染为DOM："
---

# 数据驱动

    Vue.js的核心思想是数据驱动。
    视图是由数据驱动生成的，我们对视图的修改，不会直接操作DOM，而是通过修改数据。

## 好处

- 简化代码量
- 利于维护

简洁的模板语法来声明式的将数据渲染为DOM：

```js
<div id="app">{{ message }}</div>;

var app = new Vue({
  el: "#app",
  data: {
    message: "Hello Vue!",
  },
});
```
