import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PromptOverlayRequestEvent } from "../../shared/ipc";
import { PromptComposerPanel } from "../components/PromptComposerPanel";

describe("PromptComposerPanel", () => {
  it("renders send and abort controls", () => {
    render(<PromptComposerPanel />);

    expect(screen.getByRole("button", { name: /send/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /abort/i })).toBeTruthy();
  });

  it("shows Steer label when running", () => {
    render(<PromptComposerPanel runState="running" />);

    expect(screen.getByRole("button", { name: /steer/i })).toBeTruthy();
  });

  it("shows pending count when steerCount + followUpCount > 0", () => {
    render(<PromptComposerPanel steerCount={1} followUpCount={2} />);

    const badge = screen.getByTestId("pending-count");
    expect(badge.textContent).toBe("Steer: 1 · Follow-up: 2");
  });

  it("hides pending count when both counts are zero", () => {
    render(<PromptComposerPanel steerCount={0} followUpCount={0} />);

    expect(screen.queryByTestId("pending-count")).toBeNull();
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
