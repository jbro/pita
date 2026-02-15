# Command Palette Design

**Date:** 2026-02-15  
**Status:** Approved

## Goal

Build a functional command palette with keyboard-first operation, fuzzy search, and minimal initial command set.

## Scope

V1 command palette includes:
- Clear Timeline
- Focus Prompt

Keyboard trigger: Cmd/Ctrl+K

## Architecture Overview

**Component Structure:**

```
src/renderer/
  commands/
    registry.ts          # Command definitions and registry
  components/
    CommandPalette.tsx   # Modal overlay component
  App.tsx                # Global keyboard listener (Cmd/Ctrl+K)
```

**Command Flow:**
1. User presses Cmd/Ctrl+K → App opens CommandPalette
2. User types → fuse.js filters commands
3. User navigates with arrows, presses Enter → command executes
4. Palette closes, focus returns to appropriate element

**Command Registry:**
- Each command: `{ id, label, description?, execute: () => void }`
- Registry exports array of commands
- Commands receive necessary handlers via closure/context

**Dependencies:**
- Add `fuse.js` as production dependency

## Command Registry Design

**Command Interface:**

```typescript
interface Command {
  id: string;           // "clear-timeline", "focus-prompt"
  label: string;        // "Clear Timeline"
  description?: string; // "Remove all timeline messages"
  execute: () => void;  // Action to run
}
```

**Initial Commands:**

1. **Clear Timeline**
   - `id: "clear-timeline"`
   - Clears all timeline items
   - Needs callback from App to reset timeline state

2. **Focus Prompt**
   - `id: "focus-prompt"`
   - Focuses the prompt textarea
   - Uses ref passed from App

**Registry Creation:**
- `createCommandRegistry(handlers)` function
- Takes handlers as dependencies (clearTimeline callback, promptRef)
- Returns array of Command objects
- Called from App.tsx, passed to CommandPalette

**Extension pattern:**
- New commands added to registry array
- Handlers passed in at creation time

## CommandPalette Component

**Component Structure:**

```typescript
interface CommandPaletteProps {
  isOpen: boolean;
  commands: Command[];
  onClose: () => void;
}
```

**UI Layout:**
- Modal backdrop (dims background, click to close)
- Centered search box (auto-focused when opened)
- Filtered results list below search
- Keyboard navigation: ↑↓ to navigate, Enter to execute, Esc to close

**State:**
- `searchQuery: string` - current search text
- `selectedIndex: number` - currently highlighted command (0-based)

**Fuzzy Search with fuse.js:**
- Configure with `keys: ['label', 'description']`
- Threshold: `0.3` (reasonable default, tune if needed)
- Return sorted matches, render in order

**Keyboard Handling:**
- ArrowUp/ArrowDown: move selection (with wrapping)
- Enter: execute selected command, close palette
- Escape: close palette without executing
- All other keys: handled by search input

**Styling:**
- Modal overlay with semi-transparent backdrop
- Centered panel (~500px wide, max-height with scroll)
- Highlight selected item
- Dark mode theme consistent with app

## Integration with App.tsx

**State Management:**
- Add `isPaletteOpen: boolean` state in App
- Pass to CommandPalette component

**Global Keyboard Listener:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsPaletteOpen(true);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

**Command Handlers:**
- `handleClearTimeline`: Reset timeline state (calls existing timeline hook's clear method or adds one)
- `handleFocusPrompt`: Uses ref to prompt textarea (already exists in PromptComposerPanel)

**Ref Passing:**
- Add `ref` prop to PromptComposerPanel to expose textarea ref
- Use `forwardRef` or expose via imperative handle

**Command Registry Creation:**
```typescript
const commands = createCommandRegistry({
  clearTimeline: handleClearTimeline,
  focusPrompt: () => promptRef.current?.focus(),
});
```

## Error Handling & Edge Cases

**Error Handling:**
- Command execution errors caught and logged (console.error)
- Palette closes even if command fails (don't trap user)
- No user-facing error UI for V1 (commands are simple, low risk)

**Edge Cases:**
- Palette opens while streaming: allowed, commands still work
- No search results: show "No commands found" message
- Empty command list: shouldn't happen, but render gracefully
- Rapid open/close: debounce not needed (single keypress)
- Focus management: return focus to previously focused element on close (or prompt by default)

**Accessibility:**
- Auto-focus search input when opened
- ARIA labels for screen readers
- Keyboard-only operation (already designed)

## Testing Strategy

**Unit Tests:**
- `CommandPalette.test.tsx`:
  - Renders with commands
  - Filters commands on search input
  - Arrow key navigation updates selection
  - Enter executes selected command
  - Escape closes palette
  - Click backdrop closes palette

- `registry.test.ts`:
  - Command registry creates commands with correct properties
  - Execute callbacks are called properly

**Integration Tests:**
- `command-palette-integration.test.tsx`:
  - Cmd/Ctrl+K opens palette
  - Execute "Clear Timeline" → timeline clears
  - Execute "Focus Prompt" → prompt gets focus
  - Palette closes after execution

**E2E Test:**
- Update `ui-shell.smoke.spec.ts`:
  - Add quick smoke: open palette, verify visible, close

**Manual Testing:**
- Open palette, search, navigate, execute
- Verify hot-reload works with palette open
- Test with different timeline states

## Success Criteria

- Cmd/Ctrl+K opens command palette
- Fuzzy search filters commands as you type
- Arrow keys navigate, Enter executes
- Both commands work correctly
- All tests pass
- Hot-reload works during development
