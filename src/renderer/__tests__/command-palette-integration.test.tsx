import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Provider } from "jotai";
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
  paletteSearchQueryAtom,
  paletteSelectedIndexAtom,
} from "../store/atoms";

describe("Command Palette Integration", () => {
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
    store.set(paletteSearchQueryAtom, '');
    store.set(paletteSelectedIndexAtom, 0);

    (window as typeof window & {
      pita: {
        version: string;
        session: {
          sendPrompt: ReturnType<typeof vi.fn>;
          abort: ReturnType<typeof vi.fn>;
          steer: ReturnType<typeof vi.fn>;
          followUp: ReturnType<typeof vi.fn>;
          clearQueue: ReturnType<typeof vi.fn>;
          onTimelineEvent: ReturnType<typeof vi.fn>;
          onPromptOverlayEvent: ReturnType<typeof vi.fn>;
          submitPromptOverlay: ReturnType<typeof vi.fn>;
          cancelPromptOverlay: ReturnType<typeof vi.fn>;
        };
      };
    }).pita = {
      version: "test",
      session: {
        sendPrompt: vi.fn().mockResolvedValue(undefined),
        abort: vi.fn().mockResolvedValue(undefined),
        steer: vi.fn().mockResolvedValue(undefined),
        followUp: vi.fn().mockResolvedValue(undefined),
        clearQueue: vi.fn().mockResolvedValue(undefined),
        onTimelineEvent: vi.fn(() => () => {}),
        onPromptOverlayEvent: vi.fn(() => () => {}),
        submitPromptOverlay: vi.fn().mockResolvedValue(undefined),
        cancelPromptOverlay: vi.fn().mockResolvedValue(undefined)
      }
    };
  });

  it("opens command palette with Cmd+K", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(screen.queryByPlaceholderText(/search commands/i)).toBeNull();

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    expect(screen.getByPlaceholderText(/search commands/i)).toBeTruthy();
  });

  it("opens command palette with Ctrl+K", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(screen.getByPlaceholderText(/search commands/i)).toBeTruthy();
  });

  it("clears timeline when Clear Timeline command is executed", async () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    const textarea = screen.getByRole("textbox");

    await act(async () => {
      fireEvent.change(textarea, { target: { value: "test message" } });
      fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });
    });

    expect(screen.getByText("test message")).toBeTruthy();

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const clearCommand = screen.getByText("Clear Timeline");

    await act(async () => {
      fireEvent.click(clearCommand);
    });

    expect(screen.queryByText("test message")).toBeNull();
  });

  it("focuses prompt when Focus Prompt command is executed", async () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    const textarea = screen.getByRole("textbox");
    textarea.blur();

    expect(document.activeElement).not.toBe(textarea);

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const focusCommand = screen.getByText("Focus Prompt");

    await act(async () => {
      fireEvent.click(focusCommand);
    });

    expect(document.activeElement).toBe(textarea);
  });
});
