---
title: "ESBuild-based builder, to infinity and beyond"
sourceUrl: "https://riegler.fr/blog/2023-10-13-v17-builders"
---

In recent times, there has been considerable anticipation surrounding the ESBuild-based builder, introduced as a developer preview in Angular v16. In this article, we will dive into the latest developments and insights related to this exciting new feature.

## Going stable

Since the inception of the ESBuild-based builder, the Angular tooling team has actively collected feedback from the community. With the latest enhancements to this builder, the team now feels confident enough to promote it to stable status in Angular v17.

A significant change comes with this update - the ESBuild-based builder will now be the default builder when creating new projects using the CLI. Additionally, the default project creation mode will now be "standalone."

It's worth noting that the existing Webpack-based build system will continue to receive full support for applications that wish to continue using it.

## Application builder, united we build

Angular v17 introduces the brand-new application builder. This single builder is a versatile powerhouse, supporting browser applications, prerendering, and Server-Side Rendering (SSR).

The good news is that you can already explore this feature. To get started, you can create a new project using the pre-release CLI:

```
npm create @angular@next
```

### Configuration

Let's take a closer look at the configuration file generated for a project with Prerendering and SSR enabled:

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

In this configuration, the main entry has been replaced by browser to accommodate the introduction of the server entry. The browser entry serves as the entry point for the browser application, while the server entry is for SSR and Prerendering.

This change simplifies the configuration and eliminates the need for separate build targets for various scenarios, such as browser, SSR, and prerendering.

❇️ An interesting point to note is that if either `ssr` or `prerender` are set to `true` in the configuration file, the pages served with `ng serve` will be generated server side.
So don't forget to also enable hydration with [`provideClientHydration`](https://angular.io/api/platform-browser/provideClientHydration) ! 🔥🔥🔥

Since this new builder support both the client app and the server app, the built artifacts will be both located in `dist/myApp`, respectively in `dist/myApp/browser` and `dist/myApp/server`.

Here a example output of the new builder:

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

When prerendering is enabled, you will see thatevery page has a separate directory as expected.

### Prerendering

Prerendering is enabled by setting the `prerender` option to either `true` or a configuration object with 2 entries:

- `routesFile` : The path to a file containing routes separated by newlines.
- `discoverRoutes` : Whether the builder should discover routers using the Angular Router.

Prerendering requires to have a `server` entry which the app will utilize during the build process to prerender each page of the application.

### SSR

A notable development is the consolidation of the universal repository into the CLI repository. This move aims to unify dependencies related to SSR. From now on, the server components' dependencies will be included in the new `@angular/ssr` package.

Instead of the Express engine from `@nguniversal/express-engine` the `CommonEngine` exported by the `@angular/ssr` package will be used. You can see this change in the server.ts file mentioned earlier.

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

## Transitions

![Let's talk about transitions](/blog-images/v17-builders/transitions.png)

The Angular team is committed to making the transition from Webpack to ESBuild as smooth as possible.

To transition an existing application and try the new build system, the easiest method is to change the project's browser builder from `browser` to `browser-esbuild` in the project configuration build target. The `browser-esbuild` builder acts as a compatibility layer for the `application` builder and allows projects to switch, or switch back, without requiring additional configuration changes.

It's important to note that the `browser-esbuild` builder does not provide access to the new integrated SSR and prerendering features. To enable these features, you will need to transition directly to the `application` builder and use the configuration we discussed earlier.

## Providing feedback

Although the ESBuild-based builder is being promoted to stable status in Angular v17, the Angular tooling team is always eager to receive feedback and suggestions. If you encounter any issues or have valuable insights, please don't hesitate to reach out to them directly on the [CLI repo](https://github.com/angular/angular-cli).

Your feedback will be greatly appreciated! !
