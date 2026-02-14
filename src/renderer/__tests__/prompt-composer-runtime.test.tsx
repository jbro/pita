import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PromptOverlayEvent,
  PromptOverlaySubmitRequest,
  SessionTimelineEvent
} from "../../shared/ipc";
import { App } from "../App";

function setupPitaMock() {
  const sendPrompt = vi.fn(async () => undefined);
  const abort = vi.fn(async () => undefined);
  const steer = vi.fn(async () => undefined);
  const followUp = vi.fn(async () => undefined);
  const clearQueue = vi.fn(async () => ({ steering: [], followUp: [] }));
  let timelineListener: ((event: SessionTimelineEvent) => void) | undefined;

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
      clearQueue,
      onTimelineEvent: vi.fn((listener: (event: SessionTimelineEvent) => void) => {
        timelineListener = listener;
        return () => undefined;
      }),
      onPromptOverlayEvent: vi.fn(() => () => undefined),
      submitPromptOverlay: vi.fn(async () => undefined),
      cancelPromptOverlay: vi.fn(async () => undefined)
    }
  };

  return {
    sendPrompt,
    abort,
    steer,
    followUp,
    clearQueue,
    emit(event: SessionTimelineEvent) {
      act(() => {
        timelineListener?.(event);
      });
    }
  };
}

describe("Prompt composer runtime wiring", () => {
  let mock: ReturnType<typeof setupPitaMock>;

  beforeEach(() => {
    mock = setupPitaMock();
  });

  it("sends prompts when idle and toggles abort during running", async () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    const sendButton = screen.getByRole("button", { name: /send/i });
    const abortButton = screen.getByRole("button", { name: /abort/i });

    fireEvent.change(input, { target: { value: "Run diagnostics" } });
    fireEvent.click(sendButton);

    expect(mock.sendPrompt).toHaveBeenCalledWith("Run diagnostics");
    expect(abortButton).toHaveProperty("disabled", true);

    mock.emit({ type: "state", state: "running" });

    expect(abortButton).toHaveProperty("disabled", false);

    fireEvent.click(abortButton);
    expect(mock.abort).toHaveBeenCalledTimes(1);
  });

  it("button label changes to Steer when running", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…");
    fireEvent.change(input, { target: { value: "some text" } });

    expect(screen.getByRole("button", { name: /send/i })).toBeTruthy();

    mock.emit({ type: "state", state: "running" });

    expect(screen.getByRole("button", { name: /steer/i })).toBeTruthy();
  });

  it("Enter while running calls steer instead of sendPrompt", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "fix the bug" } });

    mock.emit({ type: "state", state: "running" });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(mock.steer).toHaveBeenCalledWith("fix the bug");
    expect(mock.sendPrompt).not.toHaveBeenCalled();
  });

  it("Alt+Enter while running calls followUp", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "then run tests" } });

    mock.emit({ type: "state", state: "running" });

    fireEvent.keyDown(input, { key: "Enter", altKey: true });

    expect(mock.followUp).toHaveBeenCalledWith("then run tests");
    expect(mock.steer).not.toHaveBeenCalled();
    expect(mock.sendPrompt).not.toHaveBeenCalled();
  });

  it("Enter while idle calls sendPrompt", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "hello" } });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(mock.sendPrompt).toHaveBeenCalledWith("hello");
    expect(mock.steer).not.toHaveBeenCalled();
  });

  it("Alt+Enter while idle calls sendPrompt", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "hello" } });

    fireEvent.keyDown(input, { key: "Enter", altKey: true });

    expect(mock.sendPrompt).toHaveBeenCalledWith("hello");
    expect(mock.followUp).not.toHaveBeenCalled();
  });

  it("shows pending count when queue status is emitted", () => {
    render(<App />);

    expect(screen.queryByTestId("pending-count")).toBeNull();

    mock.emit({ type: "queue.status", steerCount: 2, followUpCount: 1 });

    const badge = screen.getByTestId("pending-count");
    expect(badge.textContent).toBe("Steer: 2 · Follow-up: 1");
  });

  it("shows separate steer and follow-up queue counts", () => {
    render(<App />);

    mock.emit({ type: "queue.status", steerCount: 1, followUpCount: 2 });

    const badge = screen.getByTestId("pending-count");
    expect(badge.textContent).toBe("Steer: 1 · Follow-up: 2");
  });

  it("hides pending count when queue resets to zero", () => {
    render(<App />);

    mock.emit({ type: "queue.status", steerCount: 1, followUpCount: 0 });
    expect(screen.getByTestId("pending-count")).toBeTruthy();

    mock.emit({ type: "queue.status", steerCount: 0, followUpCount: 0 });
    expect(screen.queryByTestId("pending-count")).toBeNull();
  });

  it("resets pending count on state idle", () => {
    render(<App />);

    mock.emit({ type: "queue.status", steerCount: 2, followUpCount: 0 });
    expect(screen.getByTestId("pending-count")).toBeTruthy();

    mock.emit({ type: "state", state: "idle" });
    expect(screen.queryByTestId("pending-count")).toBeNull();
  });

  it("Steer button click while running calls steer", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…");
    fireEvent.change(input, { target: { value: "do it" } });

    mock.emit({ type: "state", state: "running" });

    const steerButton = screen.getByRole("button", { name: /steer/i });
    fireEvent.click(steerButton);

    expect(mock.steer).toHaveBeenCalledWith("do it");
    expect(mock.sendPrompt).not.toHaveBeenCalled();
  });
});
