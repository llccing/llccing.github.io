---
pubDatetime: 2026-05-26T15:45:00Z
title: "[译] Signal 决策图"
slug: signal-decision-chart
featured: false
draft: false
isTranslation: true
tags:
  - angular
  - signals
description: 一张帮助你在 Angular 中选择合适的 Signal 原语的决策图。
canonicalURL: https://riegler.fr/blog/2025-01-12-signal-decision-chart
---

> 原文地址: https://riegler.fr/blog/2025-01-12-signal-decision-chart

![封面图片](/blog-images/signal-decision-chart/alex-king-lbwjS4QdpNU.jpg)

## Signal 决策图

### 针对你的使用场景，什么才是合适的工具？

Matthieu Riegler - 2025 年 1 月 12 日

在 Angular v16 中，Signal 作为一种新的响应式原语被引入，用于增强状态管理并简化变更检测。Signal 是持有值的函数，当值发生变化时会发出更新通知，从而实现细粒度的响应式能力，而无需依赖手动订阅或复杂的 Observable。

在 `signal()`、`computed()` 和 `effect` 这些坚实的基础之上，后续的次要/主要版本中又引入了额外的原语。

目前我们拥有的包括：

- `input()`，用于输入
- Signal 查询（`viewChild()`、`viewChildren`、`contentChild()`、`contentChildren()`）
- `model()`，用于双向绑定
- `linkedSignal`
- `resource`/`rxResource`
- `afterRenderEffect()`

框架提供的每一个原语都针对特定的使用场景。要确定哪个才是你需要的确切工具，可能会变得很困难。

下面这张图表或许可以帮助你确定你正在寻找的工具。

![Signal 决策图](/blog-images/signal-decision-chart/signal.png)

如你所见，这张图表假设你已经知道何时该使用 Signal，以及何时使用 Observable 更为合适。

注意：我会尽量让这张图表保持更新，纳入即将到来的新原语，或者在出现新的使用场景时进行更新。
