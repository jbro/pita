import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PromptComposerPanel } from "../components/PromptComposerPanel";

describe("PromptComposerPanel", () => {
  it("renders send and abort controls", () => {
    render(<PromptComposerPanel />);

    expect(screen.getByRole("button", { name: /send/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /abort/i })).toBeTruthy();
  });
});
