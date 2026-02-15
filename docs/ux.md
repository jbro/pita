# UX

## UX Goals

- Clean and focused interface.
- Keyboard-first operation.
- Fast understanding of session state.
- Reliable control while streaming.

## V1 Layout

### Timeline (Top)

Shows:
- user messages
- assistant messages
- tool executions as collapsible blocks (collapse/expand not yet implemented — flat list with role labels)

Behavior:
- live streaming updates
- collapse/expand tool output (deferred; current UI shows a flat list)
- clear state transitions (running, idle, aborting, error)

### Prompt Composer (Bottom)

Modes:
- normal prompt input mode
- confirm overlay replacement mode (when a confirm prompt overlay request is active)

Keyboard actions:
- idle: Ctrl+Enter sends, Esc clears the prompt
- running: Ctrl+Enter steers, Alt+Enter queues follow-up, Esc aborts
- Enter inserts a newline in both states

UI behavior:
- no action buttons in normal mode; keyboard shortcuts are primary
- a subtle busy spinner appears while the agent is running
- helper text under the input shows the active shortcut set

## Command Palette and Shortcuts

V1 command palette includes app commands only.

Examples:
- focus prompt
- toggle multiline mode
- clear input
- abort run
- open command palette

Keyboard shortcuts and palette actions share one command registry.

V1 provides fixed default keybindings. User-editable keymaps come later.

## Visual Style

- Dark mode by default.
- Simple, minimal visual chrome.
- Emphasis on readability and scan speed.

## Deferred UX (Post-V1)

Note: confirm-only prompt replacement overlay is now implemented in the composer area. The richer overlay UX listed below is still pending.

- Mission-control session overview.
- Resizable side panels (file tree, git, remote agents).
- Advanced text and diff viewers integrated in timeline.
- Richer extension-driven interaction patterns.

### Phase 2 Interaction: Prompt Replacement Overlay

When the agent asks a structured question or confirmation, the prompt area can be temporarily replaced by an interactive overlay.

Capabilities:
- Option buttons selectable by mouse.
- Arrow-key navigation with Enter to confirm.
- Numeric shortcuts for fast choice selection.
- Freeform text input when no listed option fits.
- Accept/reject button prompts for confirmations.

Fallback behavior:
- If extension-driven UI is unavailable, fall back to plain text prompt handling.
