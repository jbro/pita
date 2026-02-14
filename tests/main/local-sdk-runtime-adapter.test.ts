import { describe, expect, it, vi } from "vitest";
import type { PromptOverlayRequestEvent } from "../../src/shared/ipc";
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

  it("forwards confirm request events to orchestrator-facing callback", () => {
    let overlayListener: ((request: PromptOverlayRequestEvent) => void) | undefined;

    const session: LocalSdkSession = {
      ...createSession([]),
      onPromptOverlayRequest(listener) {
        overlayListener = listener;
        return () => {
          overlayListener = undefined;
        };
      },
      resolvePromptOverlay: vi.fn()
    };

    const adapter = new LocalSdkRuntimeAdapter(session);
    const requestListener = vi.fn();

    adapter.onPromptOverlayRequest?.(requestListener);

    const request: PromptOverlayRequestEvent = {
      type: "prompt_overlay_request",
      requestId: "overlay-1",
      kind: "confirm",
      title: "Confirm",
      message: "Proceed?",
      confirmLabel: "Yes",
      cancelLabel: "No"
    };

    overlayListener?.(request);

    expect(requestListener).toHaveBeenCalledTimes(1);
    expect(requestListener.mock.calls[0]?.[0]).toEqual(request);
    expect(typeof requestListener.mock.calls[0]?.[1]).toBe("function");
  });

  it("resolves submit and cancel decisions back to SDK bridge", () => {
    let overlayListener: ((request: PromptOverlayRequestEvent) => void) | undefined;
    const resolvePromptOverlay = vi.fn();

    const session: LocalSdkSession = {
      ...createSession([]),
      onPromptOverlayRequest(listener) {
        overlayListener = listener;
        return () => {
          overlayListener = undefined;
        };
      },
      resolvePromptOverlay
    };

    const adapter = new LocalSdkRuntimeAdapter(session);
    const requestListener = vi.fn();

    adapter.onPromptOverlayRequest?.(requestListener);

    overlayListener?.({
      type: "prompt_overlay_request",
      requestId: "overlay-1",
      kind: "confirm",
      title: "Confirm",
      message: "Proceed?",
      confirmLabel: "Yes",
      cancelLabel: "No"
    });

    const resolver = requestListener.mock.calls[0]?.[1] as (decision: "confirm" | "cancel") => void;
    resolver("confirm");
    resolver("cancel");

    expect(resolvePromptOverlay).toHaveBeenNthCalledWith(1, "overlay-1", "confirm");
    expect(resolvePromptOverlay).toHaveBeenNthCalledWith(2, "overlay-1", "cancel");
  });
});
