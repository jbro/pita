import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { App } from "../App";
import { store } from "../store";
import { paletteOpenAtom } from "../store/atoms";

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

    store.set(paletteOpenAtom, false);

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
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText(/search commands/i)).toBeTruthy();
  });
});
