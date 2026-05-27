---
title: "Lifecycle-Hook-Free Angular — Building Components with Modern APIs"
sourceUrl: https://riegler.fr/blog/2024-12-31-lifecycle-hook-less
---

![Lifecycle-Hook-Free Angular](/blog-images/angular-lifecycle-hook-free/cemrecan-yurtman-hmwvM0BuFOE-unsplash.jpg)

# Lifecycle-Hook-Free Angular

**Building Components with Modern APIs**

Matthieu Riegler - Dec 31, 2024

Angular is introducing new non-breaking features at a fast pace in the last 2-4 versions. While they don't break the way your existing components work, they will reshape the way we will author components in the future.

One of those type of APIs that will be discussed in this article, are the components/directives lifecycle-hooks.

## Lifecycle hooks

A component's lifecycle is the sequence of steps that happen between the component's creation and its destruction. Each step represents a different part of Angular's process for rendering components and checking them for updates over time.

Angular components & directives have 8 different lifecycle hooks.

1. `ngOnInit()`
2. `ngOnDestroy()`
3. `ngOnChanges(changes: SimpleChanges)`
4. `ngAfterContentInit()`
5. `ngAfterContentChecked()`
6. `ngAfterViewInit()`
7. `ngAfterViewChecked()`
8. `ngDoCheck()`

We'll go through the list, see what they are used for today and what are the new alternatives.

## `ngOnInit`

`ngOnInit` is called once after the component is initialized. It is mainly used for initializing component data or fetching initial resources.

Developers often reach out to this hook when they want to read inputs as it is only after init that we are sure that inputs have been set.

#### `ngOnInit` example

```typescript
@Component({
  /* ... */
})
class UserComponent {
  @Input() name: string;
  lastname = input.required<string>();

  constructor() {
    // inputs aren't set yet.
  }

  ngOnInit(): void {
    // can read inputs
  }
}
```

Up [until v17](https://v17.angular.io/guide/lifecycle-hooks#initializing-a-component-or-directive), the official recommendation was

> Components should be cheap and safe to construct. You should not, for example, fetch data in a component constructor.[…] ngOnInit() is a good place for a component to fetch its initial data.

The main argument behind that was the input weren't available for hitting that hook.

With signals, new opportunities have arisen. It is now possible to access the inputs in a safe manner.

One of the ways is by declaring a state derivation, like in a computed:

```typescript
computed(() => this.myInput());
```

Computed signals, like any other derivation (`linkedSignal`, `resource`) are lazily evaluated. When you declare such a derivation, and consume it in a template, Angular makes sure that the input will be read after it has been set.

Other common consumers of signals are `effect`. As I explained in [this article](https://riegler.fr/blog/2024-10-15-effect-context/), effects declared in components are scheduled to execute once the component is init and everytime a signal changes but before the component is sync'd.

To sum-up how what we can achieve with signals to replace `ngOnInit` here is an extensive example that relies on state derivation and `effect`.

#### With signals

```typescript
@Component({ template: `fullName()` })
class UserComponent {
  name = input.required<string>();
  lastname = input.required<string>();

  // sync & async derivations, reading some required inputs.
  fullName = computed(() => `${this.name()} ${this.lastName()}`);
  localState = linkedSignal(() => this.name());
  resource = resource({
    request: () => ({ id: this.userId() }),
    loader: request =>
      this.httpClient(`https://myendpoint.com/user/${this.id}`),
  });

  constructor() {
    effect(() => {
      // This is a view effect
      // it is first executed after init
      this.name();
    });
  }
}
```

As an extension of what previously presented, functions build on top of `effect` will benefit of the same advantages.

A great example of this is the `toObservable` function which relies on `effect`.

```typescript
@Component({
  /** ... */
})
export class FooComponent {
  readonly lang = input.required<string>();

  constructor() {
    // This is fine
    toObservable(this.lang).subscribe(/** */);
  }
}
```

In this example here, the `input` will only be evaluated by the underlying `effect` and be read after the component is initialized.

## `ngOnChanges`

The `ngOnChanges` is primarily used to be notified when one or several inputs have changed when running the sync process (formerly known as ChangeDetection).

Listening to changes is at the heart of signal-based reactivity. By building your state via state derivation, you're already making yourself ready. And for all other cases where derivation isn't possible, `effect` is the tool you will reach out for to listen for any signal changes.

### Effect scheduling

About `effect` scheduling there is one precision we can add. Depending on when you want the callback to run, you'll either reach out to `effect` or `afterRenderEffect`.

The former runs before the component is checked, the latter runs after the whole application (every component) has been rendered.

```typescript
@Component( ... )
export class FooComponent {
  name = input.required<string>();

  constructor() {
    effect(() => { ... })
  }
}
```

`effect` runs before the component is sync'd.

```typescript
@Component( ... )
export class FooComponent {
  name = input.required<string>();

  constructor() {
    afterRenderEffect(() => { ... })
  }
}
```

`afterRenderEffect` runs after the app is fully sync'd.

To sum-up, in a signal world you can simply drop `ngOnChanges`.

## ngOnDestroy

The `ngOnDestroy` hook serves mostly to trigger cleanup operations on our components.

Here an example with a simple timeout that needs to be cleared on destruction.

```typescript
@Component({ /** ... */ })
export class FooComponent {
  intervalId;

  constructor() {
    intervalId = setInterval(...);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
```

Since Angular 16, we have a new context-aware "service" `DestroyRef` to take care of clean up.

```typescript
@Component({
  /** ... */
})
export class FooComponent {
  constructor() {
    const intervalId = setInterval(() => {}, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
  }
}
```

Its `onDestroy` method callback is invoked when the context is destroyed.

The context in which they are invoked can be ranked in 3 categories:

- **Component**: when injected in a component, `DestroyRef` will trigger the callback when the component is destroyed.
- **Root Service**: when injection is a `providedIn: 'root'` service, the callback is invoked when the whole app is destroyed. This rarely happens and you can consider this as never happening in the context of a regular app.
- **Any other injector**: When injected by another injector, the callback will be invoked when the said injector itself is destroyed. For example on a `EnvironmentInjector` when `destroy` is invoked.

We can benefit from that context-aware cleanup in helper functions.

```typescript
function myFunctionThatNeedsCleanUp() {
  const destroyRef = inject(DestroyRef);

  const cleanUpOperation = someService();

  destroyRef.onDestroy(() => cleanUpOperation());
}
```

When run in an injection context, this function provides its own cleanup. This is exactly what framework provided functions like `toSignal()` do, by unsubscribing the observable when the context is destroyed.

## The "After" hooks

Behind this category of hooks, we'll discuss `ngAfterViewInit`, `ngAfterViewChecked`, `ngAfterContentInit`, `ngAfterContentChecked`.

We mostly rely on those hooks to be notified when the component is rendered.

```typescript
@Component({ template: '<canvas #myCanvas></canvas>' })
export class FooComponent {
  myCanvas = viewChild('myCanvas');

  // Runs once on creation
  ngAfterViewInit() {
    initCharts(this.myCanvas());
  }

  // Runs on every CD
  ngAfterViewChecked() {
    ...
  }
}
```

Whenever you want to get notified that Angular has finished rendering the app, you can reach out to `afterNextRender()` and `afterRender()`. The former will run the callback only once while the latter will run after each rendering cycle.

### Run once

```typescript
@Component({ template: "<canvas #myCanvas></canvas>" })
export class FooComponent {
  myCanvas = viewChild("myCanvas");

  constructor() {
    afterNextRender(() => {
      // run once after the app rendered
      initCharts(this.myCanvas());
    });
  }
}
```

Replaces `ngAfterContentInit`, `ngAfterViewInit`.

### Run everytime the app is rendered

```typescript
@Component({ template: "<canvas #myCanvas></canvas>" })
export class FooComponent {
  myChild = viewChild("childRef");

  constructor() {
    afterRender(() => {
      // run everytime the app rendered
      updateMyChild(myChild);
    });
  }
}
```

Replaces `ngAfterContentChecked`, `ngAfterViewChecked`.

This differs a bit from the lifecycle hooks, those were only scoped on components whereas the new APIs will wait for the whole app to be rendered.

This makes the API more suitable for accessing the DOM, particularly in scenarios where you need to read box dimensions. These dimensions might change when sibling elements are rendered and cause a resize, such as when different flex rules are applied.

`after(Next)Render` offers another optimization, often overlooked: ordering of DOM access for better performance.

Several DOM APIs are known to trigger costly layout reflows ([check this list](https://gist.github.com/paulirish/5d52fb081b3570c81e3a)). Having mixed read/write APIs invoked may be responsible for unnecessary additional reflows.

You can specify the semantics of your callbacks and help Angular to order them to ensure the best performance.

```typescript
afterRender({
  earlyRead: () => { ... },
  read: () => { ... },
  mixedReadWrite: () => { ... }, // Default, worst in perfs
  write() { ... }
});
```

## ngDoCheck

The `ngDoCheck` hook is probably the least known one, you'll normally reach out for it to implement a custom change detection implementation. Angular itself uses it in the `NgForOf` or the `NgClass` directive.

Today, `ngDoCheck` would be naturally replaced by simply using signals and you would rely on `effect` for side effects.

## Code collocation

If we come back to the `ngOnDestroy` example we explored earlier, we can see that one of the advantages of the new APIs is that they allow code collocation.

### Hook based

```typescript
@Component({ /** ... */ })
export class FooComponent {
  intervalId;

  constructor() {
    intervalId = setInterval(...);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
```

### Code collocation with `DestroyRef`

```typescript
@Component({
  /** ... */
})
export class FooComponent {
  constructor() {
    const intervalId = setInterval(() => {}, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
  }
}

/***/

function myFunctionThatNeedsCleanUp() {
  const destroyRef = inject(DestroyRef);
  const cleanUpOperation = someService();
  destroyRef.onDestroy(() => cleanUpOperation());
}
```

- No separate class member
- No additional method
- Whole feature is in 1 location

## Talk

You can find [my talk on that topic ⏯](https://www.youtube.com/live/5m0eqGxrLUo?si=Rs-mD5Y_4zYBpSII&t=23477) I did at NgGlühwein (Vienna, 🇦🇹, Dec. 2024)
