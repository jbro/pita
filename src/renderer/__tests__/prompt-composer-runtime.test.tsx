import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  const submitPromptOverlay = vi.fn(async () => undefined);
  const cancelPromptOverlay = vi.fn(async () => undefined);
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
      clearQueue,
      onTimelineEvent: vi.fn((listener: (event: SessionTimelineEvent) => void) => {
        timelineListener = listener;
        return () => undefined;
      }),
      onPromptOverlayEvent: vi.fn((listener: (event: PromptOverlayEvent) => void) => {
        overlayListener = listener;
        return () => undefined;
      }),
      submitPromptOverlay,
      cancelPromptOverlay
    }
  };

  return {
    sendPrompt,
    abort,
    steer,
    followUp,
    clearQueue,
    submitPromptOverlay,
    cancelPromptOverlay,
    emit(event: SessionTimelineEvent) {
      act(() => {
        timelineListener?.(event);
      });
    },
    emitOverlay(event: PromptOverlayEvent) {
      act(() => {
        overlayListener?.(event);
      });
    }
  };
}

describe("Prompt composer runtime wiring", () => {
  let mock: ReturnType<typeof setupPitaMock>;

  beforeEach(() => {
    mock = setupPitaMock();
  });

  it("sends prompts with Ctrl+Enter while idle and aborts with Escape when running", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;

    fireEvent.change(input, { target: { value: "Run diagnostics" } });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    expect(mock.sendPrompt).toHaveBeenCalledWith("Run diagnostics");
    expect(mock.abort).not.toHaveBeenCalled();

    mock.emit({ type: "state", state: "running" });

    fireEvent.keyDown(input, { key: "Escape" });
    expect(mock.abort).toHaveBeenCalledTimes(1);
  });

  it("shows busy indicator while running", () => {
    render(<App />);

    expect(screen.queryByLabelText("Agent is busy")).toBeNull();

    mock.emit({ type: "state", state: "running" });

    expect(screen.getByLabelText("Agent is busy")).toBeTruthy();
  });

  it("Enter inserts newline while running", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "fix" } });

    mock.emit({ type: "state", state: "running" });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(mock.steer).not.toHaveBeenCalled();
    expect(mock.followUp).not.toHaveBeenCalled();
    expect(mock.sendPrompt).not.toHaveBeenCalled();
  });

  it("Ctrl+Enter while running calls steer", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "fix the bug" } });

    mock.emit({ type: "state", state: "running" });

    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

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

  it("Enter inserts newline while idle", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "hello" } });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(mock.sendPrompt).not.toHaveBeenCalled();
    expect(mock.steer).not.toHaveBeenCalled();
    expect(mock.followUp).not.toHaveBeenCalled();
  });

  it("Ctrl+Enter while idle calls sendPrompt", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "hello" } });

    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    expect(mock.sendPrompt).toHaveBeenCalledWith("hello");
    expect(mock.steer).not.toHaveBeenCalled();
    expect(mock.followUp).not.toHaveBeenCalled();
  });

  it("Alt+Enter while idle calls sendPrompt", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "hello" } });

    fireEvent.keyDown(input, { key: "Enter", altKey: true });

    expect(mock.sendPrompt).toHaveBeenCalledWith("hello");
    expect(mock.followUp).not.toHaveBeenCalled();
  });

  it("Escape clears prompt while idle", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "clear me" } });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(input.value).toBe("");
    expect(mock.abort).not.toHaveBeenCalled();
  });

  it("Escape aborts while running", () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ask Pi to continue…") as HTMLTextAreaElement;

    mock.emit({ type: "state", state: "running" });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(mock.abort).toHaveBeenCalledTimes(1);
  });


  it("confirm overlay confirm action calls submitPromptOverlay", () => {
    render(<App />);

    mock.emitOverlay({
      type: "prompt_overlay_request",
      requestId: "req-confirm",
      kind: "confirm",
      title: "Confirm action",
      message: "Do the thing?",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel"
    });

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(mock.submitPromptOverlay).toHaveBeenCalledWith({
      requestId: "req-confirm",
      decision: "confirm"
    });
    expect(mock.sendPrompt).not.toHaveBeenCalled();
    expect(mock.steer).not.toHaveBeenCalled();
  });

  it("confirm overlay cancel action calls cancelPromptOverlay", () => {
    render(<App />);

    mock.emitOverlay({
      type: "prompt_overlay_request",
      requestId: "req-cancel",
      kind: "confirm",
      title: "Confirm action",
      message: "Do the thing?",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel"
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mock.cancelPromptOverlay).toHaveBeenCalledWith({ requestId: "req-cancel" });
    expect(mock.sendPrompt).not.toHaveBeenCalled();
    expect(mock.steer).not.toHaveBeenCalled();
  });

  it("shows inline error and keeps overlay active when submitPromptOverlay rejects", async () => {
    mock.submitPromptOverlay.mockRejectedValueOnce(new Error("submit failed"));

    render(<App />);

    mock.emitOverlay({
      type: "prompt_overlay_request",
      requestId: "req-error",
      kind: "confirm",
      title: "Confirm action",
      message: "Do the thing?",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel"
    });

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-overlay-error").textContent).toBe(
        "Could not submit confirmation. Try again."
      );
    });

    expect(screen.getByText("Confirm action")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Ask Pi to continue…")).toBeNull();
  });
});
