---
pubDatetime: 2026-06-02T08:00:00+08:00
title: "[译] 任务、微任务、队列与调度"
slug: tasks-microtasks-queues-and-schedules
featured: false
draft: false
isTranslation: true
tags:
  - javascript
  - event-loop
  - microtasks
  - browser
description: 本文深入解析浏览器事件循环中的任务（macrotask）与微任务（microtask）的执行顺序，以及它们在不同浏览器中的调度差异。
canonicalURL: https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/
---

> 原文地址: https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/

当我告诉同事 [Matt Gaunt](https://twitter.com/gaaborit) 我正考虑写一篇关于浏览器事件循环中微任务队列和执行的文章时，他说："老实说 Jake，我不会去读的。"好吧，我还是写了，所以我们都坐下来好好享受一下吧。好吗？

实际上，如果你更喜欢视频的话，[Philip Roberts](https://twitter.com/paborit) 在 JSConf 上做了一个[关于事件循环的精彩演讲](https://www.youtube.com/watch?v=8aGhZQkoFbQ)——虽然没有涵盖微任务，但对其余内容做了很好的介绍。好了，言归正传……

## 试一试

看看这段 JavaScript：

```js
console.log('script start');

setTimeout(function() {
  console.log('setTimeout');
}, 0);

Promise.resolve().then(function() {
  console.log('promise1');
}).then(function() {
  console.log('promise2');
});

console.log('script end');
```

日志应该以什么顺序出现？

正确答案是：`script start`、`script end`、`promise1`、`promise2`、`setTimeout`，但在浏览器支持方面情况相当混乱。

Microsoft Edge、Firefox 40、iOS Safari 和桌面版 Safari 8.0.8 在 `promise1` 和 `promise2` **之前**输出了 `setTimeout`——尽管这似乎是一个竞态条件。这非常奇怪，因为 Firefox 39 和 Safari 8.0.7 始终能得到正确的结果。

## 为什么会这样

要理解这一点，你需要知道事件循环如何处理任务和微任务。第一次接触时可能需要花些时间来理解。深呼吸……

每个"线程"都有自己的**事件循环**，因此每个 web worker 都有自己的事件循环，可以独立执行；而同源的所有窗口共享一个事件循环，因为它们可以同步通信。事件循环持续运行，执行所有排入队列的任务。一个事件循环有多个任务源，这些任务源保证了在该源内的执行顺序（[如 IndexedDB](https://w3c.github.io/IndexedDB/#database-access-task-source) 等规范定义了自己的任务源），但浏览器可以在循环的每一轮中选择从哪个任务源取任务。这使得浏览器可以优先处理性能敏感的任务，如用户输入。

**任务（Tasks）** 被调度后，浏览器可以从其内部进入 JavaScript/DOM 领域，并确保这些操作按顺序执行。在任务之间，浏览器*可能*会进行渲染更新。从鼠标点击到事件回调需要调度一个任务，解析 HTML 也是如此，在上面的例子中，`setTimeout` 也是。

`setTimeout` 等待给定的延迟时间，然后为其回调调度一个新任务。这就是为什么 `setTimeout` 在 `script end` 之后才输出的原因，因为输出 `script end` 是第一个任务的一部分，而 `setTimeout` 的输出在一个单独的任务中。

**微任务（Microtasks）** 通常用于安排那些应该在当前执行脚本之后立即发生的事情，例如对一批操作做出响应，或者在不承受全新任务开销的情况下实现异步。微任务队列在回调执行完毕后处理，前提是没有其他 JavaScript 正在执行中，并且在每个任务结束时处理。在处理微任务期间排入队列的额外微任务也会被添加到队列末尾并被处理。微任务包括 mutation observer 回调，以及上面例子中的 promise 回调。

一旦 promise 被 settle（完成或拒绝），或者如果它已经 settle，它就会为其响应回调排入一个*微任务*。这确保了即使 promise 已经 settle，promise 回调也是异步的。因此对一个已 settle 的 promise 调用 `.then(yey, nay)` 会立即排入一个微任务。这就是为什么 `promise1` 和 `promise2` 在 `script end` 之后才输出的原因，因为当前运行的脚本必须在处理微任务之前执行完毕。`promise1` 和 `promise2` 在 `setTimeout` 之前输出，因为微任务总是在下一个任务之前执行。

逐步分析：

1. 一个任务开始运行脚本。
2. `console.log('script start')` —— 输出。
3. `setTimeout` 回调被调度为一个任务。
4. Promise 的 `.then` 回调被调度为微任务。
5. `console.log('script end')` —— 输出。
6. 脚本结束。处理微任务：
   - `console.log('promise1')` —— 输出。
   - `console.log('promise2')` —— 输出。
7. 微任务队列为空。下一个任务运行：
   - `console.log('setTimeout')` —— 输出。

## 一些浏览器有什么不同表现？

一些浏览器输出 `script start`、`script end`、`setTimeout`、`promise1`、`promise2`。它们将 promise 回调作为新任务而非微任务来运行。

这在一定程度上是可以理解的，因为 promise 来自 ECMAScript 而非 HTML。ECMAScript 有"jobs"的概念，与微任务类似，但除了[模糊的邮件列表讨论](https://esdiscuss.org/topic/the-initialization-steps-for-web-browsers#content-16)外，两者之间的关系并不明确。然而，普遍共识是 promise 应该属于微任务队列，这是有充分理由的。

将 promise 视为任务会导致性能问题，因为回调可能会被与任务相关的事情（如渲染）不必要地延迟。它还会因为与其他任务源的交互而导致不确定性，并且可能破坏与其他 API 的交互，稍后会详细说明。

这是一个[让 promise 使用微任务的 Edge 工单](https://connect.microsoft.com/IE/feedback/details/1658365)。WebKit nightly 版本已经做了正确的事情，所以我猜 Safari 最终会跟进，而且在 Firefox 43 中似乎已经修复了。

有趣的是，Safari 和 Firefox 都曾经历过这方面的回退，后来又被修复。我不知道这是否只是巧合。

## 如何判断某些东西使用任务还是微任务

测试是一种方法。观察日志相对于 promise 和 setTimeout 何时出现，尽管你依赖于实现的正确性。

确定的方法是查阅规范。例如，[setTimeout 的第 14 步](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-settimeout)排入一个任务，而[排入 mutation 记录的第 5 步](https://dom.spec.whatwg.org/#queue-a-mutation-record)排入一个微任务。

如前所述，在 ECMAScript 领域，微任务被称为"jobs"。在 [PerformPromiseThen 的步骤 8.a](https://www.ecma-international.org/ecma-262/6.0/#sec-performpromisethen) 中，调用 `EnqueueJob` 来排入一个微任务。

现在，让我们看一个更复杂的例子。

## 第一关 Boss 战

在写这篇文章之前，我自己也会答错这个问题。以下是一段 HTML：

```html
<div class="outer">
  <div class="inner"></div>
</div>
```

给出以下 JS 代码，如果我点击 `div.inner`，会输出什么？

```js
// 获取这些元素
var outer = document.querySelector('.outer');
var inner = document.querySelector('.inner');

// 监听外层元素的属性变化
new MutationObserver(function() {
  console.log('mutate');
}).observe(outer, {
  attributes: true
});

// 这是一个点击监听器……
function onClick() {
  console.log('click');

  setTimeout(function() {
    console.log('timeout');
  }, 0);

  Promise.resolve().then(function() {
    console.log('promise');
  });

  outer.setAttribute('data-random', Math.random());
}

// ……我们将它绑定到两个元素上
inner.addEventListener('click', onClick);
outer.addEventListener('click', onClick);
```

在偷看答案之前，试着自己想一想。提示：日志可能会出现多次。

### 测试一下

点击内层方块来触发点击事件：

你的猜测不同吗？如果是，你可能仍然是对的。不幸的是，各浏览器在这里并不一致：

- Chrome：click, promise, mutate, click, promise, mutate, timeout, timeout
- Firefox：click, mutate, click, mutate, timeout, promise, promise, timeout
- Safari：click, mutate, click, mutate, promise, promise, timeout, timeout
- Edge：click, click, mutate, timeout, promise, timeout, promise

### 谁是正确的？

分派 'click' 事件是一个任务。Mutation observer 和 promise 回调被排入微任务队列。`setTimeout` 回调被排入任务队列。所以应该是这样的：

所以 Chrome 是正确的。对我来说"新"的发现是：微任务在回调之后处理（只要没有其他 JavaScript 正在执行中），我之前以为它仅限于任务结束时。规范中相关的部分是 [HTML 规范中调用回调](https://html.spec.whatwg.org/multipage/webappapis.html#clean-up-after-running-a-callback)的这一步：

> 如果 JavaScript 执行上下文栈现在为空，则执行一个微任务检查点。
> —— HTML：调用回调后的清理步骤 3

……而微任务检查点涉及遍历微任务队列，除非我们已经在处理微任务队列。类似地，ECMAScript 对 jobs 是这样说的：

> 只有当没有运行中的执行上下文且执行上下文栈为空时，才能启动 Job 的执行……
> —— ECMAScript：Jobs 和 Job 队列

……尽管在 HTML 上下文中，"可以"变成了"必须"。

### 各浏览器哪里做错了？

**Firefox** 和 **Safari** 正确地在点击监听器之间清空了微任务队列，如 mutation 回调所示，但 promise 似乎被以不同方式排队。鉴于 jobs 与微任务之间的联系模糊，这在一定程度上是可以理解的，但我仍然期望它们在监听器回调之间执行。[Firefox 工单](https://bugzilla.mozilla.org/show_bug.cgi?id=1193394)。[Safari 工单](https://bugs.webkit.org/show_bug.cgi?id=147933)。

对于 **Edge**，我们已经看到它错误地将 promise 作为任务排队，但它也未能在点击监听器之间清空微任务队列，而是在所有监听器调用完毕后才这样做，这就解释了为什么在两个 `click` 日志之后只有一个 `mutate` 日志。[Bug 工单](https://connect.microsoft.com/IE/feedbackdetail/view/1658386/microtasks-queues-should-be-processed-following-event-listeners)。

## 第一关 Boss 战：附加回合

嗯，使用上面同样的例子，如果我们执行以下代码会发生什么：

```js
inner.click();
```

这将同步开始事件分派，因此调用 `.click()` 的脚本在回调之间仍然在调用栈中。上面的规则仍然适用，但由于我们正处于脚本执行中，因此存在差异。

### 测试一下

- Chrome：click, click, promise, mutate, promise, timeout, timeout
- Firefox：click, click, mutate, timeout, promise, promise, timeout
- Safari：click, click, mutate, promise, promise, timeout, timeout
- Edge：click, click, mutate, timeout, promise, timeout, promise

我发誓我在 Chrome 中不断得到不同的结果，我已经多次更新了这个图表，以为我测试 Canary 的方式有误。如果你在 Chrome 中得到不同的结果，请在评论中告诉我是哪个版本。

### 为什么不一样？

以下是应该发生的过程：

所以正确的顺序是：`click`、`click`、`promise`、`mutate`、`promise`、`timeout`、`timeout`，Chrome 似乎做对了。

在每个监听器回调被调用之后……

> 如果 JavaScript 执行上下文栈现在为空，则执行一个微任务检查点。
> —— HTML：调用回调后的清理步骤 3

……但在第一个点击回调之后执行上下文栈并不为空，因为 `.click()` 仍然在栈中。上述规则仍然确保微任务不会打断正在执行中的 JavaScript。这意味着我们不会在监听器回调之间处理微任务队列，它们在两个监听器都执行完毕后才被处理。

需要注意的要点：

- 微任务在任务之间处理。
- 如果 JS 栈为空，微任务在回调结束时处理。
- 微任务可以排入更多微任务，所有这些都将在下一个任务之前被处理。

### 这重要吗？

是的，它会在一些隐蔽的地方坑你（哎哟）。我在尝试为 IndexedDB 创建一个使用 promise 而非奇怪的 `IDBRequest` 对象的简单包装库时遇到了这个问题。它[几乎让 IDB 变得有趣起来](https://github.com/nicedoc/nicerouter/tree/master/lib/idbcache)。

当 IDB 触发 success 事件时，相关的[事务对象在分派后变为非活动状态](https://w3c.github.io/IndexedDB/#fire-a-success-event)（步骤 4）。如果我创建一个在此事件触发时 resolve 的 promise，回调应该在步骤 4 之前运行（此时事务仍然活跃），但在 Chrome 以外的浏览器中情况并非如此，这使得该库几乎无法使用。

实际上你可以在 Firefox 中绕过这个问题，因为像 [es6-promise](https://github.com/jakearchibald/es6-promise) 这样的 promise polyfill 使用 mutation observer 作为回调机制，正确地使用了微任务。Safari 似乎在使用该修复时存在竞态条件，但这可能只是它们[有缺陷的 IDB 实现](https://www.raymondcamden.com/2014/09/25/IndexedDB-on-iOS-8-Broken-Bad)的问题。不幸的是，在 IE/Edge 中事情仍然有问题，因为 mutation 事件不会在回调之后处理。

希望我们很快能看到一些浏览器互操作性方面的改进。

## 你坚持到最后了！

总结：

- **任务**按顺序执行，浏览器可能在任务之间进行渲染
- **微任务**按顺序执行，并在以下时机执行：
  - 每个回调之后，只要没有其他 JavaScript 正在执行中
  - 每个任务结束时

希望你现在对事件循环有了更好的理解，或者至少有了一个去躺下休息的理由。

实际上，还有人在读吗？你好？你好？

*最初发布于 2015 年 8 月 17 日。2018 年 9 月更新。*
