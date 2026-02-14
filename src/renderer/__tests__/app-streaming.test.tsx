import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PromptOverlayEvent, PromptOverlaySubmitRequest, SessionTimelineEvent } from "../../shared/ipc";
import { App } from "../App";

describe("App streaming timeline", () => {
  let timelineListener: ((event: SessionTimelineEvent) => void) | undefined;
  const sendPrompt = vi.fn(async () => undefined);
  const abort = vi.fn(async () => undefined);

  beforeEach(() => {
    timelineListener = undefined;
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
        onPromptOverlayEvent: vi.fn(() => () => undefined),
        submitPromptOverlay: vi.fn(async () => undefined),
        cancelPromptOverlay: vi.fn(async () => undefined)
      }
    };
  });

  it("subscribes to timeline events, appends streamed content, and shows errors", () => {
    render(<App />);

    expect(window.pita.session.onTimelineEvent).toHaveBeenCalledTimes(1);

    act(() => {
      timelineListener?.({ type: "response.start", messageId: "msg-1" });
      timelineListener?.({ type: "response.chunk", messageId: "msg-1", chunk: "Hello" });
      timelineListener?.({ type: "response.chunk", messageId: "msg-1", chunk: " world" });
      timelineListener?.({ type: "error", message: "boom" });
    });

    expect(screen.getByText("Hello world")).toBeTruthy();
    expect(screen.getByText("boom")).toBeTruthy();
  });
});
