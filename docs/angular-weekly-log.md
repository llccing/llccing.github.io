# Angular 跟踪日志

> 目的：保持对 Angular 演进的持续感知，并为月度文章积累素材。
> 原则：**输入按周，输出按月**。本文件只记录，不追求可读性；文章在 `blog-topics-plan.md` 里立项。

## 为什么不做周更文章

Angular 大版本 6 个月一次，中间是 minor。按周看，真正值得写的事件大约一个月才攒够一篇的量。硬凑周更会产出「本周无大事」式的水文，反而稀释已有的 30+ 篇 Angular 内容。

因此：每周花 30-60 分钟记 log（私有），每月把 4 周 log 提炼成 1 篇有主题的文章。遇到大版本发布或重要 RFC 落地时随时插播。

## 订阅源分层

只在一级源出现信号时才往下追，避免陷进信息流。

### 一级：原始信号

- [angular/angular Releases](https://github.com/angular/angular/releases) — 每个版本的完整 CHANGELOG
- [angular/angular Discussions（RFC）](https://github.com/angular/angular/discussions) — 特性在进入 CHANGELOG 之前的设计讨论
- 关注 label：`area: core`、`area: forms`、`RFC`

### 二级：官方解读

- [angular.dev/blog](https://angular.dev/blog) — 版本发布博客与路线图

### 三级：贡献者视角

详见 [angular-contributors-blog-resources.md](./angular-contributors-blog-resources.md)。核心是 riegler.fr、blog.mgechev.com、timdeschryver.dev。

> 注：Medium 系（Netanel Basal、Tomas Trajan）国内直连 403，走 RSS。

## 差异化方向

翻译管道已接近枯竭——[riegler-angular-translation-tracker.md](./riegler-angular-translation-tracker.md) 里到 2025-04 全部 done，源头没有新增。正好是**从「译」转「写」**的时机。

三个别人写不了的角度：

1. **PR / commit 级机制解析**。中文圈几乎没有人做到这个粒度，而已有的 30+ 篇 Angular 文章正好是延伸基础。
2. **生产项目视角**。国泰值机是真实的 Angular + Node BFF 生产系统。「这个新特性在我们的生产环境里能不能用、为什么不能用」是不可替代的内容。
3. **升级路径的真实代价**。已有 `angular-upgrade-13-17.md` 和 `angular-version-update.md` 的积累，可以持续跟进。

## 每周记录模板

复制下面这段到「记录」区最上方，填完即可。空着的项直接删掉，不要为了填满而找内容。

```markdown
### YYYY-MM-DD ~ YYYY-MM-DD

- 版本 / CHANGELOG：
- RFC / Discussion：
- 贡献者文章：
- 与生产项目的关联：（这周看到的东西，哪个能用到国泰项目上？哪个明确用不了？为什么？）
- 可写成文章的点：
```

「与生产项目的关联」这一栏是重点。它是把行业信息转成个人经验的地方，也是月度文章最难被替代的部分。如果某周这一栏是空的，说明那周的信息只是新闻，不是素材。

## 记录

<!-- 最新的放最上面 -->

### 待填第一周

首次使用时的一次性动作：

1. 确认当前 Angular 稳定版与下一个大版本的时间点（本仓库既有文章里提到 v21 已发布、v22 在预览，需要以 GitHub Releases 实际情况为准再写进文章）。
2. 订阅上面三层源，一级源建议直接用 GitHub Watch → Custom → Releases。
3. 按模板记第一周。

## 月度输出记录

| 月份 | 文章 | 主题来源 | 状态 |
| --- | --- | --- | --- |
| 2026-08 | | | 待定 |
