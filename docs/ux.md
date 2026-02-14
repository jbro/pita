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
- tool executions as collapsible blocks

Behavior:
- live streaming updates
- collapse/expand tool output
- clear state transitions (running, idle, paused, error)

### Prompt Composer (Bottom)

Modes:
- single-line input
- multiline input

Actions:
- send prompt (idle)
- steer (streaming)
- queue follow-up (streaming)
- abort current run

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
