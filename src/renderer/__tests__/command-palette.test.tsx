import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { App } from "../App";
import { store } from "../store";
import {
  activeConfirmOverlayAtom,
  followUpCountAtom,
  paletteOpenAtom,
  paletteSearchQueryAtom,
  paletteSelectedIndexAtom,
  promptOverlayErrorAtom,
  promptTextAtom,
  runStateAtom,
  steerCountAtom,
  timelineItemsAtom,
} from "../store/atoms";

function resetStore(): void {
  store.set(timelineItemsAtom, []);
  store.set(runStateAtom, "idle");
  store.set(steerCountAtom, 0);
  store.set(followUpCountAtom, 0);
  store.set(activeConfirmOverlayAtom, null);
  store.set(paletteOpenAtom, false);
  store.set(promptTextAtom, "");
  store.set(promptOverlayErrorAtom, null);
  store.set(paletteSearchQueryAtom, "");
  store.set(paletteSelectedIndexAtom, 0);
}

describe("CommandPalette", () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }

    (window as any).ResizeObserver = ResizeObserverMock;
    (globalThis as any).ResizeObserver = ResizeObserverMock;
    (HTMLElement.prototype as any).scrollIntoView = vi.fn();

    resetStore();

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
        cancelPromptOverlay: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it("opens with Cmd/Ctrl+K", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(screen.queryByPlaceholderText(/search commands/i)).toBeNull();

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByPlaceholderText(/search commands/i)).toBeTruthy();
  });

  it("filters commands by search query", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    const search = screen.getByPlaceholderText(/search commands/i);
    fireEvent.change(search, { target: { value: "focus" } });

    expect(screen.getByText("Focus Prompt")).toBeTruthy();
    expect(screen.queryByText("Clear Timeline")).toBeNull();
  });

  it("executes Clear Timeline command", async () => {
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

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    await act(async () => {
      fireEvent.click(screen.getByText("Clear Timeline"));
    });

    expect(screen.queryByText("test message")).toBeNull();
  });

  it("executes Focus Prompt command", async () => {
    const focusSpy = vi
      .spyOn(HTMLTextAreaElement.prototype, "focus")
      .mockImplementation(() => undefined);

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    await act(async () => {
      fireEvent.click(screen.getByText("Focus Prompt"));
    });

    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
  });
});
