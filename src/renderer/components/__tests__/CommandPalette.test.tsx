import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("navigates down with arrow key", () => {
    render(<CommandPalette isOpen={true} commands={mockCommands} onClose={vi.fn()} />);

    const items = screen.getAllByRole("button");
    expect(items[0].className.includes("selected")).toBe(true);

    const input = screen.getByPlaceholderText(/search commands/i);
    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(items[1].className.includes("selected")).toBe(true);
  });

  it("navigates up with arrow key", () => {
    render(<CommandPalette isOpen={true} commands={mockCommands} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/search commands/i);

    fireEvent.keyDown(input, { key: "ArrowDown" });

    const items = screen.getAllByRole("button");
    expect(items[1].className.includes("selected")).toBe(true);

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(items[0].className.includes("selected")).toBe(true);
  });

  it("wraps to last item when navigating up from first", () => {
    render(<CommandPalette isOpen={true} commands={mockCommands} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/search commands/i);
    fireEvent.keyDown(input, { key: "ArrowUp" });

    const items = screen.getAllByRole("button");
    expect(items[items.length - 1].className.includes("selected")).toBe(true);
  });

  it("wraps to first item when navigating down from last", () => {
    render(<CommandPalette isOpen={true} commands={mockCommands} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/search commands/i);

    fireEvent.keyDown(input, { key: "ArrowDown" });

    const items = screen.getAllByRole("button");

    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(items[0].className.includes("selected")).toBe(true);
  });

  it("executes selected command on Enter", () => {
    const onClose = vi.fn();
    render(<CommandPalette isOpen={true} commands={mockCommands} onClose={onClose} />);

    const input = screen.getByPlaceholderText(/search commands/i);
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockCommands[0].execute).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes palette on Escape", () => {
    const onClose = vi.fn();
    render(<CommandPalette isOpen={true} commands={mockCommands} onClose={onClose} />);

    const input = screen.getByPlaceholderText(/search commands/i);
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
