---
title: "Understanding Angular's deferrable views - Part. 1"
sourceUrl: "https://riegler.fr/blog/2023-10-05-defer-part1"
---

Lazy-loading is a hot topic right now when building apps. The more you lazy-load, the smaller your main bundle will be. Angular v17 introduces deferrable views, a way to lazy-load components from the template.

Let's dive into it !

## The @defer block

### Basics

Template deferrable views are wrapped by a `@defer() { ... }` block. This block instructs the compiler to extract its content and to lazy-load it when a particular trigger is fired.

The `@defer` syntax is straightforward and looks like this :

#### **`app.component.html`**

```
<div>
  @defer {
    <app-child />
  }
</div>
```

Here the `AppComponent` will lazy load the `app-child` component as soon as the app is idle (the default trigger).
When serving/building your app you'll be able to see this in the console with the following log (the
component name is kept if you use the `namedChunk` builder option):

```
Lazy Chunk Files               | Names         |  Raw Size
appchild.component-UIYBMU37.js | -             |   1.62 kB |
```

### Triggers

For the v17 release, `@defer` comes with a set of supported conditions and triggers that will determine when to fire the component's loading.

| trigger                 | detail                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| when isVisible          | This condition precedes the triggers. It can be a variable, a function call, a piped value etc. `Observable` and the `AsyncPipe` are not supported at the time of writing |
| on idle                 | This the default behavior, it fires when the app idles (with `requestIdleCallback`)                                                                                       |
| on immediate            | The trigger fires immediately when the template is executed                                                                                                               |
| on timer(5s)            | A `setTimeout` based trigger, in milliseconds or seconds if `s` is specified                                                                                              |
| on interaction(trigger) | On click on a template reference where `#trigger` is a template reference                                                                                                 |
| on hover(trigger)       | On hover on a template reference, where `#trigger` is a template reference                                                                                                |
| on viewport(container)  | On a template entering the viewport, where `#container` is a template reference                                                                                           |

All these triggers can be combined in a single @defer instruction separated by a comma.

```
<div>
  @defer(on viewport(container), idle) {
    <app-child />
  }
</div>
```

## Prefetching

Trigger are great to fire the dynamic loading of the component. But what if we want to speed-up the data fetching by prefetching the imported file ?

This is what the `prefetch` option is for in the `@defer` block.
`prefetch` can take a set of conditions (`when ...`) and triggers (`on ...`) to determine when to fire the actual loading of the dynamically imported js module.

```
@defer (on viewport(container); prefetch on timer(5s);  prefetch when isDataLoaded()){
  <app-child />
}
```

This way, the component loading starts after the data is loaded or 5s but will only be rendered if its container enters the viewport!

Great isn't it ? 🚀

## @defer, what to do render until ?

Until our component gets loaded and rendered, we might need to fill a placeholder. This works by defining a
`@placeholder` block after the `defer` block. The placeholder will be rendered in the DOM until the defer trigger fired.
The placeholder accepts a single parameter `minimum` which is the minimum time it will be display ever after defer trigger is fired.

It can be pretty useful if we want to trigger when the placeholder enters the viewport.

#### **`mycomponent.template.html`**

```
@defer(on viewport(myPlaceholder)) {
    <app-child />
} @placeholder(minimum 5000ms) {
    <div #myPlaceholder>...</div>
}
```

Since lazy-loading might not be instant (huge component, slow network), we might want to show a loading block.
This is what the `@loading` block is for. As `@placeholder`, it accepts a `minimum` argument but also an `after` argument.

In case the lazy-loading fails, we can render an error message by defining it with an `@error` block. The error block takes no arguments;

```
@defer(on viewport(myPlaceholder)) {
   <app-child />
} @loading (minimum 1s; after 100ms){
  Loading...
} @error {
  Loading failed :(
}
```

The content of the `@placeholder`, `@loading` and `@error` blocks are eagerly loaded.

## Usage

Here is a complete(ly overcrowded) example of defer's possibilities with every feature we've seen so far :

- `when` conditions
- `on` triggers
- `prefetch` triggers
- `@placeholder` block
- `@loading` block
- `@error` block

#### **`mycomponent.template.html`**

```
@defer (when isVisible() && foo;
        on hover(button), timer(10s), idle, immediate, interaction(button), viewport(container);
        prefetch on immediate; prefetch when isDataLoaded()) {
  <calendar-cmp [date]="current"/>
}
@placeholder (minimum 500){
  Placeholder content!
}
@loading (minimum 1s; after 100ms){
  Loading...
}
@error {
  Loading failed :(
}
```

Here for you, a [stackblitz playground](https://stackblitz.com/edit/angular-at?file=src%2Fmain.ts) to start playing with this amazing new feature!

## TBC

In the upcoming article, we'll take a deep dive into the technical details of the deferrable views. How they work, how to use them and optimize your templates for them. Stay tuned.

Edit: Part 2. is available [here](blog/2023-10-08-defer-part2)
