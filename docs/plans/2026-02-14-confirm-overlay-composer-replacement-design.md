# Confirm Overlay Composer Replacement Design

**Date:** 2026-02-14  
**Status:** Proposed

## Goal

Implement a confirm-only renderer UI slice that temporarily replaces the prompt composer area when a `prompt_overlay_request` of kind `confirm` is active.

## Why now

Backend overlay plumbing is already in place (runtime adapter -> orchestrator -> IPC -> preload). The remaining gap is operator-facing UX. This slice closes that gap with minimal scope and low risk.

## Scope

### In scope

- Render confirm overlay UI in the composer area when a confirm request is active.
- Wire confirm/cancel actions to preload API methods:
  - `submitPromptOverlay({ requestId, decision })`
  - `cancelPromptOverlay({ requestId })`
- Restore normal composer UI after `prompt_overlay_resolved`.
- Keep all existing send/steer/follow-up/abort behavior unchanged when no overlay is active.

### Out of scope

- Choice/freeform overlay UI.
- Advanced keyboard navigation beyond default button focus/Enter.
- Overlay history, queueing, or multi-request UI.
- Redesign of timeline or command palette.

## Approaches considered

### Approach A: Composer replacement for confirm-only (**recommended**)

Swap the composer content to a confirm card while active.

- **Pros:** smallest useful slice, aligns with architecture intent, easy to test.
- **Cons:** specialized path that will need extension for other overlay kinds.

### Approach B: Modal/popup overlay while keeping composer visible

Show a separate overlay layer and leave composer intact.

- **Pros:** can support mixed interactions.
- **Cons:** added complexity and potential interaction ambiguity.

### Approach C: Generic overlay framework now

Implement confirm/choice/freeform shell at once.

- **Pros:** less future scaffolding churn.
- **Cons:** larger blast radius and speculative complexity.

## Recommendation

Use **Approach A** to deliver clear end-to-end value quickly and keep risk low.

## Proposed architecture

Renderer tracks one active confirm overlay request in app state.

- On `prompt_overlay_request` (`kind: confirm`): set active overlay request.
- Prompt composer renders confirm mode instead of normal input/actions.
- On confirm/cancel click: call preload submit/cancel methods with `requestId`.
- On `prompt_overlay_resolved`: clear active overlay and restore normal composer mode.

## Component changes

- `src/renderer/App.tsx`
  - Subscribe to `window.pita.session.onPromptOverlayEvent`.
  - Maintain `activePromptOverlay` state (confirm-only).
  - Pass overlay props + handlers to `PromptComposerPanel`.

- `src/renderer/components/PromptComposerPanel.tsx`
  - Add confirm-mode render branch.
  - Render title/message and confirm/cancel buttons.
  - Keep existing normal composer path unchanged.

- `src/renderer/pita.d.ts`
  - Ensure overlay methods/listeners are fully represented in window typings.

## Data flow

1. Main emits `prompt_overlay_request` with `kind: confirm`.
2. Renderer stores request and switches composer to confirm mode.
3. User clicks confirm/cancel.
4. Renderer invokes preload submit/cancel method.
5. Main emits `prompt_overlay_resolved`.
6. Renderer clears active request and restores normal composer.

## Error handling

- Ignore non-confirm overlay kinds in this slice (safe no-op + optional console warning).
- If submit/cancel promise rejects, keep overlay visible and show a compact inline error message.
- If resolved event arrives for unknown request ID, ignore safely.

## Testing strategy

- Renderer integration tests:
  - request event toggles composer to confirm mode,
  - confirm click invokes `submitPromptOverlay` with request ID,
  - cancel click invokes `cancelPromptOverlay` with request ID,
  - resolved event restores normal composer UI.

- Regression tests:
  - existing prompt lifecycle tests continue to pass when no overlay active.

## Risks and mitigations

- **Risk:** overlay event timing causes stale UI state.  
  **Mitigation:** only clear active overlay on matching request ID or explicit resolved event.

- **Risk:** UI regression in normal prompt flow.  
  **Mitigation:** keep normal render branch untouched and run full renderer regression tests.

## Next step

Create a TDD implementation plan for this confirm-only composer replacement slice and execute in small batches.
