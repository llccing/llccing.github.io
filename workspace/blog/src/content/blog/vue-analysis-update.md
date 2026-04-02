---
pubDatetime: 2019-09-08T00:00:00Z
title: "Vue update 过程"
slug: vue-analysis-update
featured: false
draft: false
tags:
  - vue
description: "```js src/core/instance/lifecycle.js src/platforms/web/runtime/index.js src/platforms/web/runtime/patch.js"
---

# update

## 路径

```js
src / core / instance / lifecycle.js;

src / platforms / web / runtime / index.js;

src / platforms / web / runtime / patch.js;

src / platforms / web / runtime / node - ops.js;
```

## 总结

通过图片可以清晰的了解初始化Vue到渲染的整个过程。

![图片](http://qiniu.llccing.cn//FrontEnd/blog/vue/new-vue.png)

## 参考

1、函数柯里化
[https://github.com/mqyqingfeng/Blog/issues/42](https://github.com/mqyqingfeng/Blog/issues/42)
