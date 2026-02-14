import { describe, expect, it, vi } from "vitest";
import {
  IPC_CHANNELS,
  type PromptOverlayEvent,
  type SessionTimelineEvent
} from "../../src/shared/ipc";
import { registerSessionIpc } from "../../src/main/ipc/sessionIpc";

describe("registerSessionIpc", () => {
  it("wires sendPrompt invoke handler to orchestrator", async () => {
    const handlers = new Map<string, (event: unknown, payload: unknown) => Promise<unknown>>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: unknown, payload: unknown) => Promise<unknown>) => {
        handlers.set(channel, handler);
      })
    };

    const orchestrator = {
      sendPrompt: vi.fn(async () => undefined),
      abort: vi.fn(async () => undefined),
      steer: vi.fn(),
      followUp: vi.fn(),
      clearQueue: vi.fn(() => ({ steering: [], followUp: [] })),
      submitPromptOverlay: vi.fn(),
      cancelPromptOverlay: vi.fn(),
      onTimelineEvent: vi.fn(() => () => undefined),
      onPromptOverlayEvent: vi.fn(() => () => undefined)
    };

    registerSessionIpc({
      ipcMain,
      orchestrator,
      getTargetWindow: () => null
    });

    const sendHandler = handlers.get(IPC_CHANNELS.sessionSendPrompt);
    expect(sendHandler).toBeTypeOf("function");

    await sendHandler?.({}, { text: "hello" });

    expect(orchestrator.sendPrompt).toHaveBeenCalledWith("hello");
  });

  it("wires abort invoke handler to orchestrator", async () => {
    const handlers = new Map<string, () => Promise<unknown>>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: () => Promise<unknown>) => {
        handlers.set(channel, handler);
      })
    };

    const orchestrator = {
      sendPrompt: vi.fn(async () => undefined),
      abort: vi.fn(async () => undefined),
      steer: vi.fn(),
      followUp: vi.fn(),
      clearQueue: vi.fn(() => ({ steering: [], followUp: [] })),
      submitPromptOverlay: vi.fn(),
      cancelPromptOverlay: vi.fn(),
      onTimelineEvent: vi.fn(() => () => undefined),
      onPromptOverlayEvent: vi.fn(() => () => undefined)
    };

    registerSessionIpc({
      ipcMain,
      orchestrator,
      getTargetWindow: () => null
    });

    const abortHandler = handlers.get(IPC_CHANNELS.sessionAbort);
    expect(abortHandler).toBeTypeOf("function");

    await abortHandler?.();

    expect(orchestrator.abort).toHaveBeenCalledTimes(1);
  });

  it("forwards timeline events to renderer on timeline channel", () => {
    let timelineListener: ((event: SessionTimelineEvent) => void) | undefined;

    const ipcMain = {
      handle: vi.fn()
    };

    const send = vi.fn();

    const orchestrator = {
      sendPrompt: vi.fn(async () => undefined),
      abort: vi.fn(async () => undefined),
      steer: vi.fn(),
      followUp: vi.fn(),
      clearQueue: vi.fn(() => ({ steering: [], followUp: [] })),
      submitPromptOverlay: vi.fn(),
      cancelPromptOverlay: vi.fn(),
      onTimelineEvent: vi.fn((listener: (event: SessionTimelineEvent) => void) => {
        timelineListener = listener;
        return () => undefined;
      }),
      onPromptOverlayEvent: vi.fn(() => () => undefined)
    };

    registerSessionIpc({
      ipcMain,
      orchestrator,
      getTargetWindow: () => ({
        webContents: {
          send
        }
      })
    });

    const event: SessionTimelineEvent = { type: "state", state: "running" };
    timelineListener?.(event);

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.sessionTimelineEvent, event);
  });

  it("wires prompt overlay submit/cancel handlers to orchestrator", async () => {
    const handlers = new Map<string, (event: unknown, payload: unknown) => Promise<unknown>>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: unknown, payload: unknown) => Promise<unknown>) => {
        handlers.set(channel, handler);
      })
    };

    const orchestrator = {
      sendPrompt: vi.fn(async () => undefined),
      abort: vi.fn(async () => undefined),
      steer: vi.fn(),
      followUp: vi.fn(),
      clearQueue: vi.fn(() => ({ steering: [], followUp: [] })),
      submitPromptOverlay: vi.fn(),
      cancelPromptOverlay: vi.fn(),
      onTimelineEvent: vi.fn(() => () => undefined),
      onPromptOverlayEvent: vi.fn(() => () => undefined)
    };

    registerSessionIpc({
      ipcMain,
      orchestrator,
      getTargetWindow: () => null
    });

    const submitHandler = handlers.get(IPC_CHANNELS.sessionPromptOverlaySubmit);
    const cancelHandler = handlers.get(IPC_CHANNELS.sessionPromptOverlayCancel);

    await submitHandler?.({}, { requestId: "overlay-1", decision: "confirm" });
    await cancelHandler?.({}, { requestId: "overlay-1" });

    expect(orchestrator.submitPromptOverlay).toHaveBeenCalledWith("overlay-1", "confirm");
    expect(orchestrator.cancelPromptOverlay).toHaveBeenCalledWith("overlay-1");
  });

  it("forwards prompt overlay events to renderer", () => {
    let overlayListener: ((event: PromptOverlayEvent) => void) | undefined;

    const ipcMain = {
      handle: vi.fn()
    };

    const send = vi.fn();

    const orchestrator = {
      sendPrompt: vi.fn(async () => undefined),
      abort: vi.fn(async () => undefined),
      steer: vi.fn(),
      followUp: vi.fn(),
      clearQueue: vi.fn(() => ({ steering: [], followUp: [] })),
      submitPromptOverlay: vi.fn(),
      cancelPromptOverlay: vi.fn(),
      onTimelineEvent: vi.fn(() => () => undefined),
      onPromptOverlayEvent: vi.fn((listener: (event: PromptOverlayEvent) => void) => {
        overlayListener = listener;
        return () => undefined;
      })
    };

    registerSessionIpc({
      ipcMain,
      orchestrator,
      getTargetWindow: () => ({
        webContents: {
          send
        }
      })
    });

    const event: PromptOverlayEvent = {
      type: "prompt_overlay_request",
      requestId: "overlay-1",
      kind: "confirm",
      title: "Confirm",
      message: "Proceed?",
      confirmLabel: "Yes",
      cancelLabel: "No"
    };

    overlayListener?.(event);

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.sessionPromptOverlayEvent, event);
  });
});
