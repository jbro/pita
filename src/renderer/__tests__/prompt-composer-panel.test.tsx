import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PromptComposerPanel } from "../components/PromptComposerPanel";

describe("PromptComposerPanel", () => {
  it("renders placeholder controls", () => {
    render(<PromptComposerPanel />);

    expect(screen.getByRole("button", { name: /send/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /steer/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /queue/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /abort/i })).toBeTruthy();
  });
});
