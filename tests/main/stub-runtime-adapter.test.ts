import { describe, expect, it, vi } from "vitest";
import { createStubRuntimeAdapter } from "../../src/main/runtime/stubRuntimeAdapter";

describe("createStubRuntimeAdapter", () => {
  it("emits start chunk end immediately in default mode", async () => {
    const adapter = createStubRuntimeAdapter("default");
    const callbacks = {
      onStart: vi.fn(),
      onChunk: vi.fn(),
      onEnd: vi.fn(),
      onError: vi.fn()
    };

    await adapter.run("hello", callbacks);

    expect(callbacks.onStart).toHaveBeenCalledTimes(1);
    expect(callbacks.onChunk).toHaveBeenCalledTimes(1);
    expect(callbacks.onEnd).toHaveBeenCalledTimes(1);
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it("keeps run active in manual-abort mode and resolves on abort", async () => {
    vi.useFakeTimers();

    const adapter = createStubRuntimeAdapter("manual-abort");
    const callbacks = {
      onStart: vi.fn(),
      onChunk: vi.fn(),
      onEnd: vi.fn(),
      onError: vi.fn()
    };

    const runPromise = adapter.run("hello", callbacks);

    expect(callbacks.onStart).toHaveBeenCalledTimes(1);
    expect(callbacks.onChunk).toHaveBeenCalledTimes(0);

    await vi.advanceTimersByTimeAsync(400);
    expect(callbacks.onChunk).toHaveBeenCalledTimes(1);

    adapter.abort();
    await runPromise;

    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    expect(callbacks.onEnd).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
