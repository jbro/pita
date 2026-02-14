import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionTimelineEvent } from "../../shared/ipc";
import { App } from "../App";

describe("Prompt composer runtime wiring", () => {
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
        })
      }
    };
  });

  it("sends prompts and toggles send/abort controls from runtime state", async () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    const sendButton = screen.getByRole("button", { name: /send/i });
    const abortButton = screen.getByRole("button", { name: /abort/i });

    fireEvent.change(input, { target: { value: "Run diagnostics" } });
    fireEvent.click(sendButton);

    expect(sendPrompt).toHaveBeenCalledWith("Run diagnostics");
    expect(sendButton).not.toHaveProperty("disabled", true);
    expect(abortButton).toHaveProperty("disabled", true);

    act(() => {
      timelineListener?.({ type: "state", state: "running" });
    });

    expect(sendButton).toHaveProperty("disabled", true);
    expect(abortButton).toHaveProperty("disabled", false);

    fireEvent.click(abortButton);
    expect(abort).toHaveBeenCalledTimes(1);
  });
});
