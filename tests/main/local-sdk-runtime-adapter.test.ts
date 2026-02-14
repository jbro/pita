import { describe, expect, it, vi } from "vitest";
import {
  LocalSdkRuntimeAdapter,
  type LocalSdkEvent,
  type LocalSdkSession
} from "../../src/main/runtime/localSdkRuntimeAdapter";

function createSession(events: LocalSdkEvent[]): LocalSdkSession {
  let listener: ((event: LocalSdkEvent) => void) | undefined;

  return {
    async sendPrompt(): Promise<void> {
      for (const event of events) {
        listener?.(event);
      }
    },
    abort: vi.fn(async () => undefined),
    steer: vi.fn(),
    followUp: vi.fn(),
    clearQueue: vi.fn(() => ({ steering: [], followUp: [] })),
    onEvent(next) {
      listener = next;
      return () => {
        listener = undefined;
      };
    }
  };
}

describe("LocalSdkRuntimeAdapter", () => {
  it("maps SDK events to runtime callbacks during run", async () => {
    const session = createSession([
      { type: "response.start", messageId: "msg-1" },
      { type: "response.chunk", messageId: "msg-1", chunk: "hello" },
      { type: "response.end", messageId: "msg-1" }
    ]);

    const adapter = new LocalSdkRuntimeAdapter(session);

    const onStart = vi.fn();
    const onChunk = vi.fn();
    const onEnd = vi.fn();
    const onError = vi.fn();

    await adapter.run("hi", { onStart, onChunk, onEnd, onError });

    expect(onStart).toHaveBeenCalledWith("msg-1");
    expect(onChunk).toHaveBeenCalledWith("msg-1", "hello");
    expect(onEnd).toHaveBeenCalledWith("msg-1");
    expect(onError).not.toHaveBeenCalled();
  });

  it("forwards abort to the active SDK session", async () => {
    const session = createSession([]);
    const adapter = new LocalSdkRuntimeAdapter(session);

    await adapter.abort();

    expect(session.abort).toHaveBeenCalledTimes(1);
  });
});
