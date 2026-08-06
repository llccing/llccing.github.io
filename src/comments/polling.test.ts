import { afterEach, describe, expect, it, vi } from "vitest";
import { startSequentialPolling } from "./polling";

afterEach(() => {
  vi.useRealTimers();
});

describe("startSequentialPolling", () => {
  it("continues polling when a request completes without changing state", async () => {
    vi.useFakeTimers();
    const poll = vi.fn().mockResolvedValue(undefined);
    const stop = startSequentialPolling(poll, 1500);

    await vi.advanceTimersByTimeAsync(1500);
    expect(poll).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1500);
    expect(poll).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(3000);
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it("waits for the current request before scheduling the next one", async () => {
    vi.useFakeTimers();
    let finishPoll: (() => void) | undefined;
    const poll = vi.fn(
      () =>
        new Promise<void>(resolve => {
          finishPoll = resolve;
        })
    );
    const stop = startSequentialPolling(poll, 1500);

    await vi.advanceTimersByTimeAsync(4500);
    expect(poll).toHaveBeenCalledTimes(1);

    finishPoll?.();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1500);
    expect(poll).toHaveBeenCalledTimes(2);

    stop();
  });
});
