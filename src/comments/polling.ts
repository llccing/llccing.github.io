export function startSequentialPolling(
  poll: () => Promise<void>,
  delayMs: number
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    timer = setTimeout(async () => {
      try {
        await poll();
      } finally {
        if (!cancelled) schedule();
      }
    }, delayMs);
  };

  schedule();
  return () => {
    cancelled = true;
    if (timer !== undefined) clearTimeout(timer);
  };
}
