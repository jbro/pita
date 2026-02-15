# Command Palette Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a functional command palette with fuzzy search, keyboard navigation, and two initial commands (Clear Timeline, Focus Prompt).

**Architecture:** Shared command registry pattern with React component. Global keyboard listener (Cmd/Ctrl+K) in App.tsx opens modal CommandPalette component. Commands defined in central registry, filtered with fuse.js, executed via callbacks.

**Tech Stack:** React, TypeScript, fuse.js, Vitest, Testing Library, Playwright

---

## Task 1: Add fuse.js Dependency

**Files:**
- Modify: `package.json`

**Step 1: Add fuse.js to dependencies**

Run:
```bash
bun add fuse.js
```

Expected: `fuse.js` added to dependencies in `package.json`

**Step 2: Verify installation**

Run:
```bash
bun install
```

Expected: Clean install, no errors

**Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "deps: add fuse.js for command palette fuzzy search"
```

---

## Task 2: Create Command Registry

**Files:**
- Create: `src/renderer/commands/registry.ts`
- Create: `src/renderer/commands/__tests__/registry.test.ts`

**Step 1: Write the failing test**

Create `src/renderer/commands/__tests__/registry.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun run test src/renderer/commands/__tests__/registry.test.ts
```

Expected: FAIL with "Cannot find module '../registry'"

**Step 3: Write minimal implementation**

Create `src/renderer/commands/registry.ts`:

```typescript
export interface Command {
  id: string;
  label: string;
  description?: string;
  execute: () => void;
}

export interface CommandHandlers {
  clearTimeline: () => void;
  focusPrompt: () => void;
}

export function createCommandRegistry(handlers: CommandHandlers): Command[] {
  return [
    {
      id: "clear-timeline",
      label: "Clear Timeline",
      description: "Remove all timeline messages",
      execute: handlers.clearTimeline,
    },
    {
      id: "focus-prompt",
      label: "Focus Prompt",
      description: "Focus the prompt input",
      execute: handlers.focusPrompt,
    },
  ];
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun run test src/renderer/commands/__tests__/registry.test.ts
```

Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/renderer/commands/
git commit -m "feat: add command registry with clear timeline and focus prompt"
```

---

## Task 3: Add Clear Method to Timeline Hook

**Files:**
- Modify: `src/renderer/hooks/useSessionTimeline.ts`
- Modify: `src/renderer/__tests__/app-streaming.test.tsx` (to verify clear works)

**Step 1: Add test for clear timeline**

Add to `src/renderer/__tests__/app-streaming.test.tsx` (after existing tests):

```typescript
it("clears timeline when clear is called", async () => {
  const { result } = renderHook(() => useSessionTimeline());

  act(() => {
    result.current.addUserMessage("test message");
  });

  expect(result.current.items).toHaveLength(1);

  act(() => {
    result.current.clearTimeline();
  });

  expect(result.current.items).toHaveLength(0);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun run test src/renderer/__tests__/app-streaming.test.tsx
```

Expected: FAIL with "clearTimeline is not a function"

**Step 3: Add clearTimeline method to hook**

Modify `src/renderer/hooks/useSessionTimeline.ts`:

Find the return statement and add `clearTimeline` to the returned object:

```typescript
const clearTimeline = (): void => {
  setItems([]);
};

return {
  items,
  runState,
  steerCount,
  followUpCount,
  addUserMessage,
  addSteerMessage,
  addQueueMessage,
  clearTimeline, // Add this line
};
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun run test src/renderer/__tests__/app-streaming.test.tsx
```

Expected: All tests PASS (including new clear test)

**Step 5: Commit**

```bash
git add src/renderer/hooks/useSessionTimeline.ts src/renderer/__tests__/app-streaming.test.tsx
git commit -m "feat: add clearTimeline method to useSessionTimeline hook"
```

---

## Task 4: Create CommandPalette Component (Part 1: Basic Rendering)

**Files:**
- Create: `src/renderer/components/CommandPalette.tsx`
- Create: `src/renderer/components/__tests__/CommandPalette.test.tsx`

**Step 1: Write failing test for basic rendering**

Create `src/renderer/components/__tests__/CommandPalette.test.tsx`:

```typescript
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

    expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
    expect(screen.getByText("Test Command 1")).toBeInTheDocument();
    expect(screen.getByText("Test Command 2")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun run test src/renderer/components/__tests__/CommandPalette.test.tsx
```

Expected: FAIL with "Cannot find module '../CommandPalette'"

**Step 3: Write minimal implementation**

Create `src/renderer/components/CommandPalette.tsx`:

```typescript
import { useEffect, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { Command } from "../commands/registry";

interface CommandPaletteProps {
  isOpen: boolean;
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({
  isOpen,
  commands,
  onClose,
}: CommandPaletteProps): JSX.Element | null {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = new Fuse(commands, {
    keys: ["label", "description"],
    threshold: 0.3,
  });

  const filteredCommands =
    searchQuery.trim() === ""
      ? commands
      : fuse.search(searchQuery).map((result) => result.item);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div className="command-palette-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="command-palette-search"
          placeholder="Search commands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="command-palette-results">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">No commands found</div>
          ) : (
            filteredCommands.map((command, index) => (
              <div
                key={command.id}
                className={`command-palette-item ${
                  index === selectedIndex ? "selected" : ""
                }`}
              >
                <div className="command-palette-item-label">{command.label}</div>
                {command.description && (
                  <div className="command-palette-item-description">
                    {command.description}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun run test src/renderer/components/__tests__/CommandPalette.test.tsx
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/renderer/components/CommandPalette.tsx src/renderer/components/__tests__/CommandPalette.test.tsx
git commit -m "feat: add CommandPalette component with basic rendering and fuzzy search"
```

---

## Task 5: Add Keyboard Navigation to CommandPalette

**Files:**
- Modify: `src/renderer/components/CommandPalette.tsx`
- Modify: `src/renderer/components/__tests__/CommandPalette.test.tsx`

**Step 1: Write tests for keyboard navigation**

Add to `src/renderer/components/__tests__/CommandPalette.test.tsx`:

```typescript
import { fireEvent } from "@testing-library/react";

// Add after existing tests:

it("navigates down with arrow key", () => {
  render(<CommandPalette isOpen={true} commands={mockCommands} onClose={vi.fn()} />);

  const items = screen.getAllByRole("button");
  expect(items[0]).toHaveClass("selected");

  const input = screen.getByPlaceholderText(/search commands/i);
  fireEvent.keyDown(input, { key: "ArrowDown" });

  expect(items[1]).toHaveClass("selected");
});

it("navigates up with arrow key", () => {
  render(<CommandPalette isOpen={true} commands={mockCommands} onClose={vi.fn()} />);

  const input = screen.getByPlaceholderText(/search commands/i);
  
  // Navigate down first
  fireEvent.keyDown(input, { key: "ArrowDown" });
  
  const items = screen.getAllByRole("button");
  expect(items[1]).toHaveClass("selected");

  // Navigate back up
  fireEvent.keyDown(input, { key: "ArrowUp" });
  expect(items[0]).toHaveClass("selected");
});

it("wraps to last item when navigating up from first", () => {
  render(<CommandPalette isOpen={true} commands={mockCommands} onClose={vi.fn()} />);

  const input = screen.getByPlaceholderText(/search commands/i);
  fireEvent.keyDown(input, { key: "ArrowUp" });

  const items = screen.getAllByRole("button");
  expect(items[items.length - 1]).toHaveClass("selected");
});

it("wraps to first item when navigating down from last", () => {
  render(<CommandPalette isOpen={true} commands={mockCommands} onClose={vi.fn()} />);

  const input = screen.getByPlaceholderText(/search commands/i);
  
  // Navigate to last item
  fireEvent.keyDown(input, { key: "ArrowDown" });
  
  const items = screen.getAllByRole("button");
  
  // Navigate down again to wrap
  fireEvent.keyDown(input, { key: "ArrowDown" });
  
  expect(items[0]).toHaveClass("selected");
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
```

**Step 2: Run test to verify failures**

Run:
```bash
bun run test src/renderer/components/__tests__/CommandPalette.test.tsx
```

Expected: Multiple failures (no role="button", no keyboard handling)

**Step 3: Add keyboard handling to CommandPalette**

Modify `src/renderer/components/CommandPalette.tsx`:

Add keyboard handler after the `filteredCommands` definition:

```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setSelectedIndex((prev) =>
      prev >= filteredCommands.length - 1 ? 0 : prev + 1
    );
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setSelectedIndex((prev) =>
      prev <= 0 ? filteredCommands.length - 1 : prev - 1
    );
  } else if (e.key === "Enter") {
    e.preventDefault();
    const selected = filteredCommands[selectedIndex];
    if (selected) {
      try {
        selected.execute();
      } catch (error) {
        console.error("Command execution failed:", error);
      }
      onClose();
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    onClose();
  }
};
```

Update the input element to use the handler:

```typescript
<input
  ref={inputRef}
  type="text"
  className="command-palette-search"
  placeholder="Search commands..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  onKeyDown={handleKeyDown}
/>
```

Update command items to be buttons with proper role:

```typescript
filteredCommands.map((command, index) => (
  <button
    key={command.id}
    type="button"
    className={`command-palette-item ${
      index === selectedIndex ? "selected" : ""
    }`}
    onClick={() => {
      try {
        command.execute();
      } catch (error) {
        console.error("Command execution failed:", error);
      }
      onClose();
    }}
  >
    <div className="command-palette-item-label">{command.label}</div>
    {command.description && (
      <div className="command-palette-item-description">
        {command.description}
      </div>
    )}
  </button>
))
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun run test src/renderer/components/__tests__/CommandPalette.test.tsx
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/renderer/components/CommandPalette.tsx src/renderer/components/__tests__/CommandPalette.test.tsx
git commit -m "feat: add keyboard navigation and command execution to CommandPalette"
```

---

## Task 6: Add CommandPalette Styles

**Files:**
- Modify: `src/renderer/styles.css`

**Step 1: Add palette styles**

Add to `src/renderer/styles.css` (after existing styles):

```css
/* Command Palette */

.command-palette-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 1000;
}

.command-palette-panel {
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.command-palette-search {
  width: 100%;
  padding: 16px 20px;
  background: #1e1e1e;
  border: none;
  border-bottom: 1px solid #3c3c3c;
  color: #e0e0e0;
  font-size: 16px;
  outline: none;
}

.command-palette-search::placeholder {
  color: #707070;
}

.command-palette-results {
  max-height: 400px;
  overflow-y: auto;
}

.command-palette-item {
  display: block;
  width: 100%;
  padding: 12px 20px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s ease;
  color: #e0e0e0;
}

.command-palette-item:hover,
.command-palette-item.selected {
  background: #2a2a2a;
}

.command-palette-item-label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.command-palette-item-description {
  font-size: 12px;
  color: #909090;
}

.command-palette-empty {
  padding: 24px 20px;
  text-align: center;
  color: #707070;
  font-size: 14px;
}
```

**Step 2: Verify styles in dev mode**

Run:
```bash
bun run dev
```

Open command palette (will wire up keyboard shortcut in next task).
For now, can test styles by temporarily setting `isOpen={true}` in App.tsx.

Expected: Palette renders with dark theme, proper spacing, hover states work

**Step 3: Commit**

```bash
git add src/renderer/styles.css
git commit -m "style: add CommandPalette dark theme styles"
```

---

## Task 7: Integrate CommandPalette with App

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/PromptComposerPanel.tsx`
- Create: `src/renderer/__tests__/command-palette-integration.test.tsx`

**Step 1: Write integration test**

Create `src/renderer/__tests__/command-palette-integration.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../App";

describe("Command Palette Integration", () => {
  beforeEach(() => {
    window.pita = {
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

  afterEach(() => {
    delete (window as any).pita;
  });

  it("opens command palette with Cmd+K", () => {
    render(<App />);

    expect(screen.queryByPlaceholderText(/search commands/i)).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
  });

  it("opens command palette with Ctrl+K", () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
  });

  it("clears timeline when Clear Timeline command is executed", async () => {
    render(<App />);

    // Add a message first
    const textarea = screen.getByRole("textbox");
    
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "test message" } });
      fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });
    });

    expect(screen.getByText("test message")).toBeInTheDocument();

    // Open palette
    fireEvent.keyDown(window, { key: "k", metaKey: true });

    // Select and execute "Clear Timeline"
    const clearCommand = screen.getByText("Clear Timeline");
    
    await act(async () => {
      fireEvent.click(clearCommand);
    });

    expect(screen.queryByText("test message")).not.toBeInTheDocument();
  });

  it("focuses prompt when Focus Prompt command is executed", async () => {
    render(<App />);

    const textarea = screen.getByRole("textbox");
    textarea.blur();

    expect(document.activeElement).not.toBe(textarea);

    // Open palette
    fireEvent.keyDown(window, { key: "k", metaKey: true });

    // Execute "Focus Prompt"
    const focusCommand = screen.getByText("Focus Prompt");
    
    await act(async () => {
      fireEvent.click(focusCommand);
    });

    expect(document.activeElement).toBe(textarea);
  });
});
```

**Step 2: Run test to verify failures**

Run:
```bash
bun run test src/renderer/__tests__/command-palette-integration.test.tsx
```

Expected: FAIL (palette not integrated yet)

**Step 3: Expose textarea ref from PromptComposerPanel**

Modify `src/renderer/components/PromptComposerPanel.tsx`:

Import `forwardRef` and `useImperativeHandle`:

```typescript
import { useEffect, useRef, type KeyboardEvent, useState, forwardRef, useImperativeHandle } from "react";
```

Add export for imperative handle:

```typescript
export interface PromptComposerHandle {
  focus: () => void;
}
```

Wrap component with `forwardRef` and add `useImperativeHandle`:

```typescript
export const PromptComposerPanel = forwardRef<PromptComposerHandle, PromptComposerPanelProps>(
  function PromptComposerPanel(
    {
      runState = "idle",
      steerCount = 0,
      followUpCount = 0,
      activeConfirmOverlay = null,
      onSend,
      onSteer,
      onFollowUp,
      onAbort,
      onConfirmOverlaySubmit,
      onConfirmOverlayCancel
    },
    ref
  ) {
    const [text, setText] = useState("");
    const [overlayError, setOverlayError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    // ... rest of component remains the same
  }
);
```

**Step 4: Integrate CommandPalette in App.tsx**

Modify `src/renderer/App.tsx`:

Add imports:

```typescript
import { useEffect, useState, useRef } from "react";
import { CommandPalette } from "./components/CommandPalette";
import { createCommandRegistry } from "./commands/registry";
import type { PromptComposerHandle } from "./components/PromptComposerPanel";
```

Add state and ref:

```typescript
export function App(): JSX.Element {
  const { items, runState, steerCount, followUpCount, addUserMessage, addSteerMessage, addQueueMessage, clearTimeline } =
    useSessionTimeline();
  const [activeConfirmOverlay, setActiveConfirmOverlay] =
    useState<PromptOverlayRequestEvent | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const promptRef = useRef<PromptComposerHandle>(null);

  // ... existing useEffect for prompt overlay ...

  // Add global keyboard listener for Cmd/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Create command registry
  const commands = createCommandRegistry({
    clearTimeline,
    focusPrompt: () => {
      promptRef.current?.focus();
    },
  });

  // ... existing handlers ...

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <header className="app-header">Pita · Phase 1 UI Shell</header>

        <main className="app-main">
          <TimelinePanel items={items} />
        </main>

        <PromptComposerPanel
          ref={promptRef}
          runState={runState}
          steerCount={steerCount}
          followUpCount={followUpCount}
          activeConfirmOverlay={activeConfirmOverlay}
          onSend={handleSend}
          onSteer={handleSteer}
          onFollowUp={handleFollowUp}
          onAbort={handleAbort}
          onConfirmOverlaySubmit={handleConfirmOverlaySubmit}
          onConfirmOverlayCancel={handleConfirmOverlayCancel}
        />

        <CommandPalette
          isOpen={isPaletteOpen}
          commands={commands}
          onClose={() => setIsPaletteOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
```

**Step 5: Run test to verify it passes**

Run:
```bash
bun run test src/renderer/__tests__/command-palette-integration.test.tsx
```

Expected: All tests PASS

**Step 6: Run all tests**

Run:
```bash
bun run test
```

Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/renderer/App.tsx src/renderer/components/PromptComposerPanel.tsx src/renderer/__tests__/command-palette-integration.test.tsx
git commit -m "feat: integrate CommandPalette with App and keyboard shortcuts"
```

---

## Task 8: Update E2E Smoke Test

**Files:**
- Modify: `tests/e2e/ui-shell.smoke.spec.ts`

**Step 1: Add command palette smoke test**

Add to `tests/e2e/ui-shell.smoke.spec.ts`:

```typescript
test("command palette opens and closes", async ({ page }) => {
  await page.keyboard.press("Meta+K");
  
  await expect(page.getByPlaceholder(/search commands/i)).toBeVisible();
  
  await page.keyboard.press("Escape");
  
  await expect(page.getByPlaceholder(/search commands/i)).not.toBeVisible();
});
```

**Step 2: Run E2E test to verify**

Run:
```bash
bun run test:e2e
```

Expected: All E2E tests PASS (including new palette test)

**Step 3: Commit**

```bash
git add tests/e2e/ui-shell.smoke.spec.ts
git commit -m "test: add command palette smoke test to E2E suite"
```

---

## Task 9: Manual Verification and Documentation

**Step 1: Manual verification checklist**

Run:
```bash
bun run dev
```

Verify:
- [ ] Cmd/Ctrl+K opens command palette
- [ ] Search input is auto-focused
- [ ] Typing filters commands (fuzzy search works)
- [ ] Arrow keys navigate up/down with wrapping
- [ ] Enter executes selected command
- [ ] Escape closes palette
- [ ] Click backdrop closes palette
- [ ] Clear Timeline command clears messages
- [ ] Focus Prompt command focuses textarea
- [ ] Hot-reload works while palette is open
- [ ] Dark theme matches app style

**Step 2: Run full test suite**

Run:
```bash
bun run typecheck
bun run test
bun run test:e2e
```

Expected: All checks PASS

**Step 3: Update roadmap**

Modify `docs/roadmap.md`:

Change:
```markdown
Remaining:
- Command palette behavior beyond placeholder.
```

To:
```markdown
Completed in V1:
- Command palette with fuzzy search (Cmd/Ctrl+K), Clear Timeline and Focus Prompt commands.

Remaining:
```

**Step 4: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs: mark command palette as completed in roadmap"
```

---

## Success Criteria

- [x] Cmd/Ctrl+K opens command palette modal
- [x] Fuzzy search filters commands with fuse.js
- [x] Arrow keys navigate, Enter executes, Escape closes
- [x] Clear Timeline command works
- [x] Focus Prompt command works
- [x] All unit tests pass
- [x] All integration tests pass
- [x] E2E smoke test passes
- [x] Hot-reload works during development
- [x] Dark theme matches app style

## Testing Commands

**Unit tests:**
```bash
bun run test
```

**Type checking:**
```bash
bun run typecheck
```

**E2E tests:**
```bash
bun run test:e2e
```

**Dev mode:**
```bash
bun run dev
```
