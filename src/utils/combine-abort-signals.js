export function combineAbortSignals(...signals) {
  const activeSignals = signals.filter(Boolean);
  if (activeSignals.length === 0) return { signal: undefined, dispose() {} };
  if (activeSignals.length === 1) return { signal: activeSignals[0], dispose() {} };

  const controller = new AbortController();
  const abortListeners = activeSignals.map((signal) => {
    const abort = () => controller.abort(signal.reason);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
    return { signal, abort };
  });

  return {
    signal: controller.signal,
    dispose() {
      for (const { signal, abort } of abortListeners) {
        signal.removeEventListener('abort', abort);
      }
    },
  };
}
