import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommandPalettePlaceholder } from "../components/CommandPalettePlaceholder";

describe("CommandPalettePlaceholder", () => {
  it("renders title and keyboard hint", () => {
    render(<CommandPalettePlaceholder />);

    expect(screen.getByText("Command Palette")).toBeTruthy();
    expect(screen.getByText(/Press Cmd\/Ctrl\+K/i)).toBeTruthy();
  });
});
