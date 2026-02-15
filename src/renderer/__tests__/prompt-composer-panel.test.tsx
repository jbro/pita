import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PromptOverlayRequestEvent } from "../../shared/ipc";
import { PromptComposerPanel } from "../components/PromptComposerPanel";

describe("PromptComposerPanel", () => {
  it("renders textarea and no action buttons in normal mode", () => {
    render(<PromptComposerPanel />);

    expect(screen.getByPlaceholderText("Ask Pi to continue…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /send/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /abort/i })).toBeNull();
  });

  it("shows busy spinner when running", () => {
    render(<PromptComposerPanel runState="running" />);

    expect(screen.getByLabelText("Agent is busy")).toBeTruthy();
  });

  it("renders confirm overlay mode when active confirm request exists", () => {
    const overlay: PromptOverlayRequestEvent = {
      type: "prompt_overlay_request",
      requestId: "req-1",
      kind: "confirm",
      title: "Allow command?",
      message: "Run git clean?",
      confirmLabel: "Allow",
      cancelLabel: "Deny"
    };

    render(<PromptComposerPanel activeConfirmOverlay={overlay} />);

    expect(screen.getByText("Allow command?")).toBeTruthy();
    expect(screen.getByText("Run git clean?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Allow" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Deny" })).toBeTruthy();
    expect(screen.queryByPlaceholderText("Ask Pi to continue…")).toBeNull();
  });

  it("calls confirm overlay handlers when confirm/cancel buttons are clicked", () => {
    const overlay: PromptOverlayRequestEvent = {
      type: "prompt_overlay_request",
      requestId: "req-2",
      kind: "confirm",
      title: "Confirm action",
      message: "Proceed?",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel"
    };
    const onConfirmOverlaySubmit = vi.fn(async () => undefined);
    const onConfirmOverlayCancel = vi.fn(async () => undefined);

    render(
      <PromptComposerPanel
        activeConfirmOverlay={overlay}
        onConfirmOverlaySubmit={onConfirmOverlaySubmit}
        onConfirmOverlayCancel={onConfirmOverlayCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirmOverlaySubmit).toHaveBeenCalledWith("req-2");
    expect(onConfirmOverlayCancel).toHaveBeenCalledWith("req-2");
  });
});
