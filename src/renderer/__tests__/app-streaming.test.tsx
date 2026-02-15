import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Provider } from "jotai";
import type { PromptOverlayEvent, PromptOverlaySubmitRequest, SessionTimelineEvent } from "../../shared/ipc";
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
import { useSessionTimeline } from "../hooks/useSessionTimeline";

describe("App streaming timeline", () => {
  let timelineListener: ((event: SessionTimelineEvent) => void) | undefined;
  let overlayListener: ((event: PromptOverlayEvent) => void) | undefined;
  const sendPrompt = vi.fn(async () => undefined);
  const abort = vi.fn(async () => undefined);

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

    timelineListener = undefined;
    overlayListener = undefined;
    sendPrompt.mockClear();
    abort.mockClear();

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
        steer: vi.fn(async () => undefined),
        followUp: vi.fn(async () => undefined),
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
  });

  it("subscribes to timeline events, appends streamed content, and shows errors", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(window.pita.session.onTimelineEvent).toHaveBeenCalledTimes(1);

    act(() => {
      timelineListener?.({ type: "response.start", messageId: "msg-1" });
      timelineListener?.({ type: "response.chunk", messageId: "msg-1", chunk: "Hello" });
      timelineListener?.({ type: "response.chunk", messageId: "msg-1", chunk: " world" });
      timelineListener?.({ type: "error", message: "boom" });
    });

    expect(screen.getByText("Hello world")).toBeTruthy();
    expect(screen.getByText("Error: boom")).toBeTruthy();
  });

  it("switches composer into confirm overlay mode on prompt_overlay_request", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    act(() => {
      overlayListener?.({
        type: "prompt_overlay_request",
        requestId: "req-1",
        kind: "confirm",
        title: "Allow command?",
        message: "Run git clean?",
        confirmLabel: "Allow",
        cancelLabel: "Deny"
      });
    });

    expect(screen.getByText("Allow command?")).toBeTruthy();
    expect(screen.getByText("Run git clean?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Allow" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Deny" })).toBeTruthy();
    expect(screen.queryByPlaceholderText("Ask Pi to continue…")).toBeNull();
  });

  it("appends a user message to the timeline when Ctrl+Enter sends", async () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    const input = screen.getByPlaceholderText("Ask Pi to continue…");
    fireEvent.change(input, { target: { value: "hello world" } });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    });

    const userItems = screen.getAllByText("user");
    expect(userItems.length).toBeGreaterThanOrEqual(1);
    const helloMatches = screen.getAllByText("hello world");
    expect(helloMatches.length).toBeGreaterThanOrEqual(1);
    const timelineMatch = helloMatches.find((el) => el.tagName === "SPAN");
    expect(timelineMatch).toBeTruthy();
  });

  it("clears timeline when clear is called", async () => {
    const { result } = renderHook(() => useSessionTimeline());

    act(() => {
      result.current.addUserMessage("test message");
    });

    expect(result.current.items).toHaveLength(1);

    act(() => {
      result.current.clearTimeline();
    });

    expect(result.current.items).toHaveLength(0);
  });
});
