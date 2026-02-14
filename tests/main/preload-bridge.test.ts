import { beforeEach, describe, expect, it, vi } from "vitest";

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();
const on = vi.fn();
const off = vi.fn();

vi.mock("electron", () => {
  return {
    contextBridge: {
      exposeInMainWorld
    },
    ipcRenderer: {
      invoke,
      on,
      off
    }
  };
});

describe("preload bridge", () => {
  beforeEach(() => {
    exposeInMainWorld.mockReset();
    invoke.mockReset();
    on.mockReset();
    off.mockReset();
  });

  it("exposes session methods, overlay methods, and unsubscribe behavior", async () => {
    await import("../../src/preload/preload");

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);

    const [namespace, api] = exposeInMainWorld.mock.calls[0] as [
      string,
      {
        session: {
          sendPrompt(text: string): Promise<void>;
          abort(): Promise<void>;
          submitPromptOverlay(request: { requestId: string; decision: "confirm" | "cancel" }): Promise<void>;
          cancelPromptOverlay(request: { requestId: string }): Promise<void>;
          onTimelineEvent(listener: (event: unknown) => void): () => void;
          onPromptOverlayEvent(listener: (event: unknown) => void): () => void;
        };
      }
    ];

    expect(namespace).toBe("pita");

    await api.session.sendPrompt("hello");
    expect(invoke).toHaveBeenCalledWith("session.sendPrompt", { text: "hello" });

    await api.session.abort();
    expect(invoke).toHaveBeenCalledWith("session.abort");

    await api.session.submitPromptOverlay({ requestId: "overlay-1", decision: "confirm" });
    expect(invoke).toHaveBeenCalledWith("session.promptOverlaySubmit", {
      requestId: "overlay-1",
      decision: "confirm"
    });

    await api.session.cancelPromptOverlay({ requestId: "overlay-1" });
    expect(invoke).toHaveBeenCalledWith("session.promptOverlayCancel", { requestId: "overlay-1" });

    const timelineListener = vi.fn();
    const unsubscribeTimeline = api.session.onTimelineEvent(timelineListener);

    expect(on).toHaveBeenCalledWith("session.timelineEvent", expect.any(Function));

    const timelineBridgeHandler = on.mock.calls[0]?.[1] as (event: unknown, payload: unknown) => void;
    const timelinePayload = { type: "state", state: "running" };
    timelineBridgeHandler({}, timelinePayload);
    expect(timelineListener).toHaveBeenCalledWith(timelinePayload);

    unsubscribeTimeline();
    expect(off).toHaveBeenCalledWith("session.timelineEvent", timelineBridgeHandler);

    const overlayListener = vi.fn();
    const unsubscribeOverlay = api.session.onPromptOverlayEvent(overlayListener);

    expect(on).toHaveBeenCalledWith("session.promptOverlayEvent", expect.any(Function));

    const overlayBridgeHandler = on.mock.calls[1]?.[1] as (event: unknown, payload: unknown) => void;
    const overlayPayload = {
      type: "prompt_overlay_request",
      requestId: "overlay-1",
      kind: "confirm",
      title: "Confirm",
      message: "Proceed?",
      confirmLabel: "Yes",
      cancelLabel: "No"
    };
    overlayBridgeHandler({}, overlayPayload);
    expect(overlayListener).toHaveBeenCalledWith(overlayPayload);

    unsubscribeOverlay();
    expect(off).toHaveBeenCalledWith("session.promptOverlayEvent", overlayBridgeHandler);
  });
});
