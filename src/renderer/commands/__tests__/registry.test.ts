import { describe, it, expect, vi } from "vitest";
import { createCommandRegistry } from "../registry";

describe("Command Registry", () => {
  it("creates clear timeline command", () => {
    const clearTimeline = vi.fn();
    const focusPrompt = vi.fn();

    const commands = createCommandRegistry({
      clearTimeline,
      focusPrompt,
    });

    const clearCmd = commands.find((c) => c.id === "clear-timeline");
    expect(clearCmd).toBeDefined();
    expect(clearCmd?.label).toBe("Clear Timeline");
    expect(clearCmd?.description).toBe("Remove all timeline messages");
  });

  it("creates focus prompt command", () => {
    const clearTimeline = vi.fn();
    const focusPrompt = vi.fn();

    const commands = createCommandRegistry({
      clearTimeline,
      focusPrompt,
    });

    const focusCmd = commands.find((c) => c.id === "focus-prompt");
    expect(focusCmd).toBeDefined();
    expect(focusCmd?.label).toBe("Focus Prompt");
    expect(focusCmd?.description).toBe("Focus the prompt input");
  });

  it("executes clear timeline command", () => {
    const clearTimeline = vi.fn();
    const focusPrompt = vi.fn();

    const commands = createCommandRegistry({
      clearTimeline,
      focusPrompt,
    });

    const clearCmd = commands.find((c) => c.id === "clear-timeline");
    clearCmd?.execute();

    expect(clearTimeline).toHaveBeenCalledOnce();
  });

  it("executes focus prompt command", () => {
    const clearTimeline = vi.fn();
    const focusPrompt = vi.fn();

    const commands = createCommandRegistry({
      clearTimeline,
      focusPrompt,
    });

    const focusCmd = commands.find((c) => c.id === "focus-prompt");
    focusCmd?.execute();

    expect(focusPrompt).toHaveBeenCalledOnce();
  });
});
