import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommandPalette } from "../CommandPalette";
import type { Command } from "../../commands/registry";

describe("CommandPalette", () => {
  const mockCommands: Command[] = [
    {
      id: "test-1",
      label: "Test Command 1",
      description: "First test command",
      execute: vi.fn(),
    },
    {
      id: "test-2",
      label: "Test Command 2",
      description: "Second test command",
      execute: vi.fn(),
    },
  ];

  it("renders nothing when closed", () => {
    const { container } = render(
      <CommandPalette isOpen={false} commands={mockCommands} onClose={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders palette when open", () => {
    render(<CommandPalette isOpen={true} commands={mockCommands} onClose={vi.fn()} />);

    expect(screen.getByPlaceholderText(/search commands/i)).toBeTruthy();
    expect(screen.getByText("Test Command 1")).toBeTruthy();
    expect(screen.getByText("Test Command 2")).toBeTruthy();
  });
});
