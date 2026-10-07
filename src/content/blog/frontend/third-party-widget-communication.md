---
title: "Integrating with Third-Party Widget Injection: A Guide to Inter-Widget Communication"
pubDatetime: 2026-08-07T10:00:00+08:00
description: "Learn how third-party scripts inject UI widgets into your web app and discover practical patterns for communicating between third-party widgets and your own components."
author: Rowan Liu
tags:
  - javascript
  - frontend
  - web-apis
  - integration
  - dom
  - architecture
featured: true
draft: false
---

## Table of Contents

## Introduction

Modern web applications often integrate third-party services that inject UI elements directly into your pages—feedback widgets, chat bubbles, notification banners, and personalization overlays. These scripts operate independently, loading asynchronously and modifying your DOM without your application's direct control.

Recently, I encountered an interesting challenge: A third-party experimentation platform injected a feedback popup into our application. The requirement was straightforward—after a user interacted with this popup (submitted a rating or closed it), we needed to display our own custom card at the bottom of the page.

The technical puzzle? How do you detect when a user completes an interaction with a widget you don't control, managed by code you didn't write, operating in the same DOM but conceptually isolated from your application logic?

This post explores the mechanics of third-party script injection and presents four practical communication patterns for coordinating between third-party widgets and your own components.

## How Third-Party Script Injection Works

### The Script Loading Pattern

Third-party widgets typically follow a two-phase loading strategy:

```html
<!-- Phase 1: Load the bootstrap script -->
<script src="https://cdn.vendor.example/widget-loader.js" async></script>

<!-- Phase 2: Queue configuration before the script loads -->
<script>
  window.vendorWidget = window.vendorWidget || [];
  window.vendorWidget.push({
    type: "load",
    config: {
      widgetId: "feedback-popup-123",
      selector: "#app-container",
      // ... widget configuration
    },
  });
</script>
```

This pattern solves a critical timing problem: your page might queue widget configurations before the vendor's script has loaded. The array acts as a message queue that the vendor script processes once initialized.

### The Queue-Based API Pattern

The `window.vendorWidget.push()` pattern is elegant:

1. **Before the script loads**: `window.vendorWidget` is a plain JavaScript array, so `push()` simply adds items
2. **After the script loads**: The vendor replaces the array with an object that has a `push` method, processing each queued item and handling new items immediately

Here's how vendors typically implement this:

```javascript
// Vendor's loader script
(function () {
  const queue = window.vendorWidget || [];

  window.vendorWidget = {
    push: function (config) {
      // Process configuration immediately
      processWidgetConfig(config);
    },
  };

  // Process any queued configurations
  queue.forEach(config => window.vendorWidget.push(config));
})();
```

### DOM Injection Mechanics

Once the configuration is processed, the vendor script:

1. **Finds the injection point** using the provided CSS selector
2. **Creates widget DOM elements** (usually a container div with nested elements)
3. **Injects styles** (inline styles, style tags, or external stylesheets)
4. **Attaches event listeners** for user interactions
5. **Manages the widget lifecycle** (show, hide, remove)

Example vendor widget injection:

```javascript
function injectWidget(config) {
  const target = document.querySelector(config.selector);
  if (!target) return;

  const widget = document.createElement("div");
  widget.className = "vendor-widget-popup";
  widget.innerHTML = `
    <div class="widget-content">
      <h3>We'd love your feedback</h3>
      <div class="rating-buttons">
        <button data-rating="1">1</button>
        <button data-rating="2">2</button>
        <button data-rating="3">3</button>
        <button data-rating="4">4</button>
        <button data-rating="5">5</button>
      </div>
      <button class="close-button">Close</button>
    </div>
  `;

  target.appendChild(widget);
  attachWidgetEventHandlers(widget, config);
}
```

### The Isolation Challenge

Third-party widgets operate in your page's global scope, sharing the same `window` object and DOM, but they're designed to be self-contained:

- **CSS isolation**: Class naming conventions (BEM, unique prefixes) or Shadow DOM
- **JavaScript isolation**: Closures, IIFE patterns, minimal global pollution
- **Event handling**: Delegated listeners scoped to widget containers

This isolation is great for preventing conflicts, but it makes communication difficult when you need to coordinate between the vendor widget and your application.

## The Communication Challenge

### Why You Can't Just "Call a Function"

When a user clicks a rating button inside the vendor widget, that click event is handled by the vendor's code, not yours. You can't simply pass a callback function like this:

```javascript
// This doesn't work with most third-party widgets
window.vendorWidget.push({
  type: "load",
  config: {
    onClose: () => {
      // Your custom logic here
      showCustomCard();
    },
  },
});
```

Unless the vendor explicitly supports callbacks in their configuration API, you're operating in separate execution contexts with no direct communication channel.

### Security Considerations

Even if communication were straightforward, there are security implications:

- **Cross-Site Scripting (XSS)**: Third-party scripts have full access to your DOM
- **Content Security Policy (CSP)**: Your CSP rules must allow the third-party origin
- **Data leakage**: Widgets might capture sensitive user data
- **Code integrity**: Third-party code can change without your knowledge

These concerns make it essential to use standard, predictable communication patterns rather than deeply coupling your code with vendor implementations.

## Solution Pattern 1: Event-Based Communication (Recommended)

The cleanest solution is using the browser's native event system. If you control the third-party script or can request features from the vendor, you can dispatch custom events at key lifecycle moments.

### Implementation from the Widget Side

```javascript
// Inside the vendor widget code (if you control it or can request this feature)
function handleRatingSubmit(rating) {
  // Vendor's internal logic
  submitRatingToBackend(rating);
  closeWidget();

  // Dispatch custom event for host application
  const event = new CustomEvent("widget:feedback-submitted", {
    detail: {
      widgetId: "feedback-popup-123",
      rating: rating,
      timestamp: Date.now(),
    },
    bubbles: true,
    composed: true,
  });

  document.dispatchEvent(event);
}

function handleWidgetClose() {
  closeWidget();

  const event = new CustomEvent("widget:closed", {
    detail: {
      widgetId: "feedback-popup-123",
      action: "user-dismissed",
      timestamp: Date.now(),
    },
    bubbles: true,
    composed: true,
  });

  document.dispatchEvent(event);
}
```

### Listening from Your Application

```typescript
// Your application code
interface WidgetEventDetail {
  widgetId: string;
  rating?: number;
  action?: string;
  timestamp: number;
}

class WidgetIntegrationService {
  private customCardComponent: CustomCard | null = null;

  init() {
    // Listen for widget completion events
    document.addEventListener("widget:feedback-submitted", (event: Event) => {
      const customEvent = event as CustomEvent<WidgetEventDetail>;
      this.handleWidgetCompletion(customEvent.detail);
    });

    document.addEventListener("widget:closed", (event: Event) => {
      const customEvent = event as CustomEvent<WidgetEventDetail>;
      this.handleWidgetCompletion(customEvent.detail);
    });
  }

  private handleWidgetCompletion(detail: WidgetEventDetail) {
    console.log("Widget interaction completed:", detail);

    // Show your custom card
    this.showCustomCard({
      message: detail.rating
        ? `Thank you for your ${detail.rating}-star rating!`
        : "Thank you for your feedback!",
      duration: 5000,
    });
  }

  private showCustomCard(config: { message: string; duration: number }) {
    if (this.customCardComponent) {
      this.customCardComponent.remove();
    }

    this.customCardComponent = new CustomCard(config);
    this.customCardComponent.render();
  }
}

// Initialize
const integration = new WidgetIntegrationService();
integration.init();
```

### Pros and Cons

**Pros:**

- Clean, decoupled architecture
- Uses standard browser APIs
- Events bubble through the DOM naturally
- Easy to debug with DevTools event listeners
- Multiple components can listen to the same event

**Cons:**

- Requires third-party vendor support or control over their code
- Event naming conventions must be coordinated
- Type safety requires additional TypeScript definitions

## Solution Pattern 2: MutationObserver

If you can't modify the third-party widget code, you can observe DOM changes to detect when the widget is removed, which typically signals user interaction completion.

### Implementation

```typescript
class WidgetDOMObserver {
  private observer: MutationObserver | null = null;
  private widgetElement: Element | null = null;
  private onWidgetRemoved: () => void;

  constructor(widgetSelector: string, onWidgetRemoved: () => void) {
    this.onWidgetRemoved = onWidgetRemoved;
    this.observe(widgetSelector);
  }

  private observe(widgetSelector: string) {
    // Wait for widget to appear in DOM
    const checkInterval = setInterval(() => {
      this.widgetElement = document.querySelector(widgetSelector);

      if (this.widgetElement) {
        clearInterval(checkInterval);
        this.startObserving();
      }
    }, 100);

    // Stop checking after 10 seconds
    setTimeout(() => clearInterval(checkInterval), 10000);
  }

  private startObserving() {
    if (!this.widgetElement || !this.widgetElement.parentElement) return;

    this.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        // Check if widget was removed
        if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
          const wasRemoved = Array.from(mutation.removedNodes).some(
            node => node === this.widgetElement
          );

          if (wasRemoved) {
            console.log("Widget removed from DOM");
            this.onWidgetRemoved();
            this.disconnect();
            break;
          }
        }
      }
    });

    // Observe the parent container for child removals
    this.observer.observe(this.widgetElement.parentElement, {
      childList: true,
      subtree: false,
    });
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Usage
const observer = new WidgetDOMObserver(".vendor-widget-popup", () => {
  console.log("Widget interaction completed");
  showCustomCard();
});
```

### Enhanced Pattern: Observing Visibility Changes

Sometimes widgets aren't removed but just hidden:

```typescript
class WidgetVisibilityObserver {
  private observer: MutationObserver | null = null;

  observe(widgetSelector: string, onHidden: () => void) {
    const widget = document.querySelector(widgetSelector) as HTMLElement;
    if (!widget) return;

    this.observer = new MutationObserver(mutations => {
      const currentDisplay = window.getComputedStyle(widget).display;
      const currentVisibility = window.getComputedStyle(widget).visibility;

      if (currentDisplay === "none" || currentVisibility === "hidden") {
        console.log("Widget hidden");
        onHidden();
        this.disconnect();
      }
    });

    this.observer.observe(widget, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  disconnect() {
    this.observer?.disconnect();
  }
}
```

### Pros and Cons

**Pros:**

- Works without vendor cooperation
- Reliable for detecting DOM changes
- Standard browser API with good support

**Cons:**

- Performance overhead (observers fire frequently)
- Indirect signal (widget removal ≠ necessarily user action)
- Must poll initially to find the widget
- Doesn't distinguish between user actions (close vs submit)

## Solution Pattern 3: API Wrapping and Proxying

You can intercept the vendor's API calls to inject your own lifecycle hooks without modifying their code.

### Implementation

```typescript
class VendorAPIWrapper {
  private originalPush: Function;
  private activeWidgets = new Map<string, WidgetMetadata>();

  constructor() {
    this.wrapVendorAPI();
  }

  private wrapVendorAPI() {
    // Wait for vendor's global object to exist
    const checkVendor = setInterval(() => {
      if (
        window.vendorWidget &&
        typeof window.vendorWidget.push === "function"
      ) {
        clearInterval(checkVendor);
        this.interceptPush();
      }
    }, 50);

    setTimeout(() => clearInterval(checkVendor), 5000);
  }

  private interceptPush() {
    this.originalPush = window.vendorWidget.push.bind(window.vendorWidget);

    window.vendorWidget.push = (config: any) => {
      console.log("Widget configuration intercepted:", config);

      // Call original push
      const result = this.originalPush(config);

      // Add our own tracking and hooks
      this.instrumentWidget(config);

      return result;
    };
  }

  private instrumentWidget(config: any) {
    const widgetId = config.config?.widgetId || config.config?.widget_id;

    if (!widgetId) return;

    // Store widget metadata
    this.activeWidgets.set(widgetId, {
      id: widgetId,
      injectedAt: Date.now(),
      config: config,
    });

    // Poll for widget in DOM and attach listeners
    this.waitForWidget(widgetId, config.config?.selector || "body");
  }

  private waitForWidget(widgetId: string, containerSelector: string) {
    const pollInterval = setInterval(() => {
      const container = document.querySelector(containerSelector);
      const widget = container?.querySelector(".vendor-widget-popup");

      if (widget) {
        clearInterval(pollInterval);
        this.attachCustomListeners(widget, widgetId);
      }
    }, 100);

    setTimeout(() => clearInterval(pollInterval), 10000);
  }

  private attachCustomListeners(widget: Element, widgetId: string) {
    // Listen for clicks on widget buttons
    widget.addEventListener("click", (event: Event) => {
      const target = event.target as HTMLElement;

      if (target.matches(".rating-buttons button")) {
        const rating = target.dataset.rating;
        console.log(`Rating ${rating} clicked for widget ${widgetId}`);

        // Emit custom event after short delay (let vendor process first)
        setTimeout(() => {
          this.emitWidgetEvent("rating-submitted", { widgetId, rating });
        }, 100);
      }

      if (target.matches(".close-button")) {
        console.log(`Close clicked for widget ${widgetId}`);

        setTimeout(() => {
          this.emitWidgetEvent("widget-closed", { widgetId });
        }, 100);
      }
    });
  }

  private emitWidgetEvent(eventName: string, detail: any) {
    const event = new CustomEvent(`vendor-widget:${eventName}`, {
      detail,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }
}

// Initialize wrapper before vendor script loads
const wrapper = new VendorAPIWrapper();

// Listen for wrapped events
document.addEventListener("vendor-widget:rating-submitted", (e: Event) => {
  const customEvent = e as CustomEvent;
  console.log("Rating submitted:", customEvent.detail);
  showCustomCard();
});

document.addEventListener("vendor-widget:widget-closed", (e: Event) => {
  const customEvent = e as CustomEvent;
  console.log("Widget closed:", customEvent.detail);
  showCustomCard();
});
```

### Pros and Cons

**Pros:**

- Full control without vendor modifications
- Can add rich tracking and analytics
- Maintains separation of concerns

**Cons:**

- Brittle—breaks if vendor changes their API
- Timing-sensitive (must wrap before vendor initializes)
- Complexity increases maintenance burden
- May violate vendor's terms of service

## Solution Pattern 4: Polling and State Checking

When all else fails, periodic checking provides a reliable fallback.

### Implementation

```typescript
class WidgetPollingService {
  private pollingInterval: number | null = null;
  private widgetPreviouslyVisible = false;
  private readonly POLL_INTERVAL_MS = 500;

  startPolling(widgetSelector: string, onWidgetGone: () => void) {
    this.pollingInterval = window.setInterval(() => {
      const widget = document.querySelector(widgetSelector);
      const isVisible =
        widget !== null && this.isElementVisible(widget as HTMLElement);

      // Detect transition from visible to not visible
      if (this.widgetPreviouslyVisible && !isVisible) {
        console.log("Widget is no longer visible");
        onWidgetGone();
        this.stopPolling();
      }

      this.widgetPreviouslyVisible = isVisible;
    }, this.POLL_INTERVAL_MS);
  }

  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

// Usage
const pollingService = new WidgetPollingService();
pollingService.startPolling(".vendor-widget-popup", () => {
  showCustomCard();
});
```

### Pros and Cons

**Pros:**

- Simple and predictable
- Guaranteed to eventually detect state changes
- Works in any scenario

**Cons:**

- Performance overhead from continuous polling
- Timing uncertainty (500ms latency in this example)
- Battery drain on mobile devices
- Less elegant than event-driven approaches

## Implementation: Custom Follow-Up Card

Now let's implement the custom card component that displays after widget interaction.

### Component Design

```typescript
interface CustomCardConfig {
  message: string;
  duration?: number; // Auto-dismiss after N milliseconds
  position?: "bottom" | "top";
  dismissible?: boolean;
  onDismiss?: () => void;
}

class CustomCard {
  private element: HTMLElement | null = null;
  private config: Required<CustomCardConfig>;
  private dismissTimeout: number | null = null;

  constructor(config: CustomCardConfig) {
    this.config = {
      message: config.message,
      duration: config.duration ?? 5000,
      position: config.position ?? "bottom",
      dismissible: config.dismissible ?? true,
      onDismiss: config.onDismiss ?? (() => {}),
    };
  }

  render() {
    this.element = document.createElement("div");
    this.element.className = "custom-follow-up-card";
    this.element.setAttribute("role", "status");
    this.element.setAttribute("aria-live", "polite");

    this.element.innerHTML = `
      <div class="card-content">
        <p class="card-message">${this.escapeHtml(this.config.message)}</p>
        ${this.config.dismissible ? '<button class="card-dismiss" aria-label="Dismiss">×</button>' : ""}
      </div>
    `;

    this.applyStyles();
    this.attachEventListeners();

    document.body.appendChild(this.element);

    // Trigger animation
    requestAnimationFrame(() => {
      this.element?.classList.add("visible");
    });

    // Auto-dismiss
    if (this.config.duration > 0) {
      this.dismissTimeout = window.setTimeout(() => {
        this.remove();
      }, this.config.duration);
    }
  }

  private applyStyles() {
    if (!this.element) return;

    const baseStyles = `
      position: fixed;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      ${this.config.position === "bottom" ? "bottom: -100px;" : "top: -100px;"}
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 16px 20px;
      z-index: 10000;
      max-width: 500px;
      width: calc(100% - 32px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
    `;

    const visibleStyles = `
      ${this.config.position === "bottom" ? "bottom: 20px;" : "top: 20px;"}
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    `;

    // Inject global styles
    if (!document.getElementById("custom-card-styles")) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "custom-card-styles";
      styleSheet.textContent = `
        .custom-follow-up-card {
          ${baseStyles}
        }
        .custom-follow-up-card.visible {
          ${visibleStyles}
        }
        .card-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .card-message {
          flex: 1;
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
        }
        .card-dismiss {
          background: none;
          border: none;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-dismiss:hover {
          color: #333;
        }
        .card-dismiss:focus {
          outline: 2px solid #0066cc;
          outline-offset: 2px;
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }

  private attachEventListeners() {
    if (!this.element) return;

    const dismissButton = this.element.querySelector(".card-dismiss");
    if (dismissButton) {
      dismissButton.addEventListener("click", () => {
        this.remove();
      });
    }

    // Keyboard accessibility
    this.element.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.remove();
      }
    });
  }

  remove() {
    if (!this.element) return;

    // Clear auto-dismiss timeout
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }

    // Animate out
    this.element.classList.remove("visible");

    // Remove from DOM after animation
    setTimeout(() => {
      this.element?.remove();
      this.element = null;
      this.config.onDismiss();
    }, 300);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
```

### Usage Example

```typescript
// After detecting widget completion (any pattern)
function showCustomCard() {
  const card = new CustomCard({
    message: "Thank you for your feedback! Your input helps us improve.",
    duration: 5000,
    position: "bottom",
    dismissible: true,
    onDismiss: () => {
      console.log("Card dismissed");
      // Track analytics
    },
  });

  card.render();
}
```

## Testing and Debugging

### Local Testing Strategy

```javascript
// Mock the third-party widget for testing
window.mockVendorWidget = {
  show() {
    const widget = document.createElement("div");
    widget.className = "vendor-widget-popup";
    widget.innerHTML = `
      <div class="widget-content">
        <h3>Mock Feedback Widget</h3>
        <button class="rating-buttons" data-rating="5">Rate 5</button>
        <button class="close-button">Close</button>
      </div>
    `;
    document.body.appendChild(widget);

    // Simulate close after 3 seconds
    setTimeout(() => {
      widget.remove();
      document.dispatchEvent(
        new CustomEvent("widget:closed", {
          detail: { widgetId: "test", action: "auto-close" },
        })
      );
    }, 3000);
  },
};

// Test your integration
window.mockVendorWidget.show();
```

### Browser DevTools Techniques

**Monitor Custom Events:**

```javascript
// Log all custom events
const originalDispatch = EventTarget.prototype.dispatchEvent;
EventTarget.prototype.dispatchEvent = function (event) {
  if (event.type.startsWith("widget:")) {
    console.log("Custom event:", event.type, event);
  }
  return originalDispatch.call(this, event);
};
```

**Track MutationObserver Activity:**

```javascript
// See what mutations are being observed
const originalObserve = MutationObserver.prototype.observe;
MutationObserver.prototype.observe = function (...args) {
  console.log("MutationObserver.observe called:", args);
  return originalObserve.apply(this, args);
};
```

### Common Pitfalls

1. **Race Conditions**: Widget might load before your listener is attached

   - Solution: Use `MutationObserver` to detect widget injection, then attach listeners

2. **Multiple Widget Instances**: User might interact multiple times

   - Solution: Track widget IDs and prevent duplicate custom cards

3. **Memory Leaks**: Observers and event listeners not cleaned up

   - Solution: Always call `disconnect()` and `removeEventListener()`

4. **Timing Issues**: Your code runs before vendor script loads
   - Solution: Use initialization checks or DOMContentLoaded events

## Production Considerations

### Content Security Policy

Third-party scripts require CSP allowances:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  script-src 'self' https://cdn.vendor.example;
  style-src 'self' 'unsafe-inline' https://cdn.vendor.example;
  connect-src 'self' https://api.vendor.example;
"
/>
```

Consider using `'strict-dynamic'` with nonces for better security while maintaining flexibility.

### Error Handling

```typescript
class RobustWidgetIntegration {
  init() {
    try {
      this.setupEventListeners();
    } catch (error) {
      console.error("Widget integration setup failed:", error);
      this.reportError(error);
    }
  }

  private setupEventListeners() {
    window.addEventListener("widget:closed", event => {
      try {
        this.handleWidgetEvent(event);
      } catch (error) {
        console.error("Widget event handler failed:", error);
        this.reportError(error);
        // Gracefully degrade—don't show custom card if handling fails
      }
    });
  }

  private reportError(error: Error) {
    // Send to your error tracking service
    if (window.errorTracker) {
      window.errorTracker.report({
        message: error.message,
        stack: error.stack,
        context: "widget-integration",
      });
    }
  }
}
```

### Analytics and Tracking

```typescript
interface WidgetAnalytics {
  widgetShown: (widgetId: string) => void;
  widgetInteraction: (widgetId: string, action: string) => void;
  customCardShown: (trigger: string) => void;
  customCardDismissed: (method: string) => void;
}

class TrackedWidgetIntegration {
  constructor(private analytics: WidgetAnalytics) {}

  init() {
    document.addEventListener("widget:closed", event => {
      const detail = (event as CustomEvent).detail;

      this.analytics.widgetInteraction(detail.widgetId, "closed");
      this.showCustomCard();
      this.analytics.customCardShown("widget-closed");
    });
  }

  private showCustomCard() {
    const card = new CustomCard({
      message: "Thank you!",
      onDismiss: () => {
        this.analytics.customCardDismissed("user-action");
      },
    });
    card.render();
  }
}
```

### Performance Monitoring

```typescript
class PerformanceTrackedIntegration {
  private performanceMarks = new Map<string, number>();

  init() {
    this.mark("integration-init-start");

    document.addEventListener("widget:closed", event => {
      this.mark("widget-closed-received");
      this.showCustomCard();
      this.mark("custom-card-shown");

      this.measureAndReport();
    });

    this.mark("integration-init-end");
  }

  private mark(name: string) {
    this.performanceMarks.set(name, performance.now());
    performance.mark(name);
  }

  private measureAndReport() {
    const initStart = this.performanceMarks.get("integration-init-start") ?? 0;
    const cardShown = this.performanceMarks.get("custom-card-shown") ?? 0;

    const totalTime = cardShown - initStart;

    console.log("Widget integration timing:", {
      totalTime: `${totalTime.toFixed(2)}ms`,
      marks: Object.fromEntries(this.performanceMarks),
    });

    // Report to analytics
    if (window.analytics) {
      window.analytics.timing("widget-integration", "total", totalTime);
    }
  }
}
```

## Conclusion

Integrating with third-party widget injection requires understanding the mechanics of script loading, DOM manipulation, and execution contexts. When you need to coordinate between a third-party widget and your own components, you have four main patterns:

1. **Event-Based Communication** — The cleanest approach when you control the third-party code or the vendor provides event hooks
2. **MutationObserver** — Reliable for detecting DOM changes without vendor cooperation, though with some performance overhead
3. **API Wrapping** — Provides full control but is fragile and maintenance-intensive
4. **Polling** — Simple and guaranteed to work, but least efficient

**Choose Event-Based Communication** when possible—it's standard, performant, and maintainable. **Fall back to MutationObserver** when you can't modify the third-party widget. **Use API Wrapping** only when you need deep integration and can maintain the wrapper. **Reserve Polling** for edge cases where other patterns fail.

The custom card component pattern shown here provides a reusable, accessible way to display follow-up UI with proper positioning, animations, and keyboard support.

As web platforms evolve, emerging standards like Web Components and the Shadow DOM will provide better isolation and communication primitives. Until then, these patterns offer practical, production-ready solutions for the common challenge of coordinating between independent UI widgets on the same page.

### Further Reading

- [CustomEvent API on MDN](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
- [MutationObserver API on MDN](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Web Components: Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
