import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
