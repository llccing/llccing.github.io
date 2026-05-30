---
pubDatetime: 2026-05-30T14:26:34+08:00
title: "[译] ESBuild-based builder, to infinity and beyond"
slug: v17-builders
featured: false
draft: true
isTranslation: true
tags:
  - angular
  - tooling
description: "v17 构建者方面的新增内容"
canonicalURL: https://riegler.fr/blog/2023-10-13-v17-builders
---

> 原文地址: https://riegler.fr/blog/2023-10-13-v17-builders

最近，人们对基于 ESBuild 的构建器抱有相当大的期待，该构建器在 Angular v16 中作为开发者预览版引入。在本文中，我们将深入探讨与这一令人兴奋的新功能相关的最新进展和见解。

## 趋于稳定

自从基于 ESBuild 的构建器诞生以来，Angular 工具团队就积极收集社区的反馈。通过对该构建器的最新增强，团队现在有足够的信心将其在 Angular v17 中提升到稳定状态。

此更新带来了重大变化 - 基于 ESBuild 的构建器现在将成为使用 CLI 创建新项目时的默认构建器。此外，默认的项目创建模式现在将是“独立”。

值得注意的是，现有的基于 Webpack 的构建系统将继续获得对希望继续使用它的应用程序的全面支持。

## 应用程序构建者，我们团结起来构建

Angular v17 引入了全新的应用程序构建器。这个单一的构建器是一个多功能的强大工具，支持浏览器应用程序、预渲染和服务器端渲染 (SSR)。

好消息是您已经可以探索此功能了。首先，您可以使用预发布 CLI 创建一个新项目：

```
npm create @angular@next
```

### 配置

让我们仔细看看为启用预渲染和 SSR 的项目生成的配置文件：

#### **`angular.json`**

```
"architect": {
  "build": {
    "builder": "@angular-devkit/build-angular:application", // 🎉 new builder 🎉
    "options": {
      "outputPath": "dist/myApp",
      "index": "src/index.html",
      "browser": "src/main.ts",
      "server": "src/main.server.ts",
      "prerender": true,
      "ssr": { // could also be `"ssr": true`
        "entry": "server.ts"
      },
      ... // assets, styles, tsconfig, polyfills etc.
    },
  }
}
```

在此配置中，主条目已被浏览器取代，以适应服务器条目的引入。浏览器入口作为浏览器应用程序的入口点，而服务器入口则用于SSR和预渲染。

此更改简化了配置，并且无需为各种场景（例如浏览器、SSR 和预渲染）单独构建目标。

❇️ 需要注意的一个有趣的地方是，如果在配置文件中将 `ssr` 或 `prerender` 设置为 `true`，则使用 `ng serve` 提供服务的页面将在服务器端生成。
因此，不要忘记使用 [`provideClientHydration`](https://angular.io/api/platform-browser/provideClientHydration) 启用水合作用！ 🔥🔥🔥

由于这个新的构建器同时支持客户端应用程序和服务器应用程序，因此构建的工件将分别位于 `dist/myApp` 中，分别位于 `dist/myApp/browser` 和 `dist/myApp/server` 中。

这是新构建器的输出示例：

```
├── dist/myApp
│   ├── server
│   │   ├── index.server.html
│   │   ├── main.server.mjs
│   │   ├── server.mjs
│   │   ├── some.component-PTPK7J6R.mjs
│   │   ├── other.component-PT0PDR.mjs
│   │   ├── other components ....
│   ├── browser
│   │   ├── some-page
│   │   │   ├── other-page.component-PTK5V6R.mjs
│   │   ├── some-other-page
│   │   │   ├── some-page.component-PTK5V6R.mjs
│   │   ├── main-BJXWUQT3.js
│   │   ├── polyfills-4DMFFUAS.js
│   │   ├── chunk-4GGQ6HNR.js
│   │   ├── some.component-PTPK7J6R.mjs
│   │   ├── other components..
```

启用预渲染后，您将看到每个页面都有一个单独的目录，如预期的那样。

### 预渲染

通过将 `prerender` 选项设置为 `true` 或具有 2 个条目的配置对象来启用预渲染：

- `routesFile` ：包含由换行符分隔的路由的文件的路径。
- `discoverRoutes` ：构建器是否应使用 Angular 路由器发现路由器。

预渲染需要有一个 `server` 条目，应用程序将在构建过程中使用该条目来预渲染应用程序的每个页面。

### 固态继电器

一个值得注意的进展是将通用存储库合并到 CLI 存储库中。此举旨在统一与SSR相关的依赖关系。从现在开始，服务器组件的依赖项将包含在新的 `@angular/ssr` 包中。

将使用 `@angular/ssr` 包导出的 `CommonEngine`，而不是 `@nguniversal/express-engine` 中的 Express 引擎。您可以在前面提到的 server.ts 文件中看到此更改。

#### _`server.ts`_

```
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: req.originalUrl,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}
```

## 过渡

![Let's talk about transitions](/blog-images/v17-builders/transitions.png)

Angular 团队致力于尽可能顺利地从 Webpack 过渡到 ESBuild。

要转换现有应用程序并尝试新的构建系统，最简单的方法是在项目配置构建目标中将项目的浏览器构建器从 `browser` 更改为 `browser-esbuild`。 `browser-esbuild` 构建器充当 `application` 构建器的兼容层，允许项目切换或切换回来，而无需进行额外的配置更改。

请务必注意，`browser-esbuild` 构建器不提供对新的集成 SSR 和预渲染功能的访问。要启用这些功能，您需要直接转换到 `application` 构建器并使用我们之前讨论的配置。

## 提供反馈

尽管基于 ESBuild 的构建器在 Angular v17 中被提升到稳定状态，但 Angular 工具团队始终渴望收到反馈和建议。如果您遇到任何问题或有宝贵的见解，请随时通过 [CLI repo](https://github.com/angular/angular-cli) 直接与他们联系。

我们将非常感谢您的反馈！ ！
