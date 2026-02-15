import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Provider } from "jotai";
import type {
  PromptOverlayEvent,
  PromptOverlaySubmitRequest,
  SessionTimelineEvent
} from "../../shared/ipc";
import { App } from "../App";
import { store } from "../store";
import {
  timelineItemsAtom,
  runStateAtom,
  steerCountAtom,
  followUpCountAtom,
  activeConfirmOverlayAtom,
  paletteOpenAtom,
  promptTextAtom,
  promptOverlayErrorAtom,
} from "../store/atoms";

function setupPitaMock() {
  const sendPrompt = vi.fn(async () => undefined);
  const abort = vi.fn(async () => undefined);
  const steer = vi.fn(async () => undefined);
  const followUp = vi.fn(async () => undefined);
  let timelineListener: ((event: SessionTimelineEvent) => void) | undefined;
  let overlayListener: ((event: PromptOverlayEvent) => void) | undefined;

  (window as typeof window & {
    pita: {
      version: string;
      session: {
        sendPrompt(text: string): Promise<void>;
        abort(): Promise<void>;
        steer(text: string): Promise<void>;
        followUp(text: string): Promise<void>;
        clearQueue(): Promise<{ steering: string[]; followUp: string[] }>;
        onTimelineEvent(listener: (event: SessionTimelineEvent) => void): () => void;
        onPromptOverlayEvent(listener: (event: PromptOverlayEvent) => void): () => void;
        submitPromptOverlay(request: PromptOverlaySubmitRequest): Promise<void>;
        cancelPromptOverlay(request: { requestId: string }): Promise<void>;
      };
    };
  }).pita = {
    version: "test",
    session: {
      sendPrompt,
      abort,
      steer,
      followUp,
      clearQueue: vi.fn(async () => ({ steering: [], followUp: [] })),
      onTimelineEvent: vi.fn((listener: (event: SessionTimelineEvent) => void) => {
        timelineListener = listener;
        return () => undefined;
      }),
      onPromptOverlayEvent: vi.fn((listener: (event: PromptOverlayEvent) => void) => {
        overlayListener = listener;
        return () => undefined;
      }),
      submitPromptOverlay: vi.fn(async () => undefined),
      cancelPromptOverlay: vi.fn(async () => undefined)
    }
  };

  return {
    sendPrompt,
    steer,
    followUp,
    emit(event: SessionTimelineEvent) {
      act(() => {
        timelineListener?.(event);
      });
    }
  };
}

describe("Prompt shortcuts integration", () => {
  let mock: ReturnType<typeof setupPitaMock>;

  beforeEach(() => {
    // Reset store state between tests
    store.set(timelineItemsAtom, []);
    store.set(runStateAtom, 'idle');
    store.set(steerCountAtom, 0);
    store.set(followUpCountAtom, 0);
    store.set(activeConfirmOverlayAtom, null);
    store.set(paletteOpenAtom, false);
    store.set(promptTextAtom, '');
    store.set(promptOverlayErrorAtom, null);

    mock = setupPitaMock();
  });

  it("Alt+Enter sends normally when idle", async () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    const input = screen.getByPlaceholderText("Ask Pi to continue…");
    fireEvent.change(input, { target: { value: "idle prompt" } });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", altKey: true });
    });

    expect(mock.sendPrompt).toHaveBeenCalledWith("idle prompt");
    expect(mock.steer).not.toHaveBeenCalled();
    expect(mock.followUp).not.toHaveBeenCalled();
  });

  it("Alt+Enter queues while running and adds italic QUEUE timeline item", async () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    const input = screen.getByPlaceholderText("Ask Pi to continue…");
    fireEvent.change(input, { target: { value: "queued command" } });

    mock.emit({ type: "state", state: "running" });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", altKey: true });
    });

    expect(mock.followUp).toHaveBeenCalledWith("queued command");
    expect(mock.steer).not.toHaveBeenCalled();

    const timeline = screen.getByTestId("timeline-panel");
    expect(within(timeline).getByText("follow-up")).toBeTruthy();
    const queuedText = within(timeline).getByText("queued command");
    expect(queuedText.className).toContain("timeline-command-text");
  });

  it("Ctrl+Enter steers while running and adds italic STEER timeline item", async () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    const input = screen.getByPlaceholderText("Ask Pi to continue…");
    fireEvent.change(input, { target: { value: "steer command" } });

    mock.emit({ type: "state", state: "running" });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    });

    expect(mock.steer).toHaveBeenCalledWith("steer command");
    expect(mock.followUp).not.toHaveBeenCalled();

    const timeline = screen.getByTestId("timeline-panel");
    expect(within(timeline).getByText("steer")).toBeTruthy();
    const steerText = within(timeline).getByText("steer command");
    expect(steerText.className).toContain("timeline-command-text");
  });
});
