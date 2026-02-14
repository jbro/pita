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

  it("exposes session methods and timeline unsubscribe behavior", async () => {
    await import("../../src/preload/preload");

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);

    const [namespace, api] = exposeInMainWorld.mock.calls[0] as [string, {
      session: {
        sendPrompt(text: string): Promise<void>;
        abort(): Promise<void>;
        onTimelineEvent(listener: (event: unknown) => void): () => void;
      };
    }];

    expect(namespace).toBe("pita");

    await api.session.sendPrompt("hello");
    expect(invoke).toHaveBeenCalledWith("session.sendPrompt", { text: "hello" });

    await api.session.abort();
    expect(invoke).toHaveBeenCalledWith("session.abort");

    const listener = vi.fn();
    const unsubscribe = api.session.onTimelineEvent(listener);

    expect(on).toHaveBeenCalledWith("session.timelineEvent", expect.any(Function));

    const bridgeHandler = on.mock.calls[0]?.[1] as (event: unknown, payload: unknown) => void;
    const payload = { type: "state", state: "running" };
    bridgeHandler({}, payload);
    expect(listener).toHaveBeenCalledWith(payload);

    unsubscribe();
    expect(off).toHaveBeenCalledWith("session.timelineEvent", bridgeHandler);
  });
});
