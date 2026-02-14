# File Context and Review Steering Concept

**Status:** Future work (concept)  
**Intent:** Balanced review + authoring workflows

## Problem

Current prompt workflows rely heavily on manual context assembly. We need a file-centric workflow where users can:

- browse and view files with syntax highlighting,
- add whole files or selections to prompt context,
- reference selections/comments naturally in prompts (`#selection`, `#comments`),
- steer review and follow-up actions from attached comments,
- work with files that do not yet exist.

## Scope (Concept-Level)

This concept describes UX and architecture direction only. It does not define immediate implementation tasks.

## Primary User Goals

1. Quickly inspect files with syntax-aware rendering.
2. Add relevant context to prompts with minimal friction.
3. Use active selections as first-class prompt references.
4. Attach comments to selections and use those comments as steering input.
5. Review or draft new files using full/diff/inline-diff views.

## Core Behaviors

### 1) File Viewer + Browser

- File browser with selectable entries.
- File viewer with syntax highlighting.
- User can select ranges in the viewer for context operations.

### 2) Context Injection Rules

- `@file` syntax supports whole-file context inclusion.
- `@file` autocomplete:
  - real repo files only,
  - optional `.gitignore`-aware filtering.

### 3) Explicit Prompt References (Predictable Resolution)

Prompt context includes only explicitly referenced items:

- `@path/to/file.ts` => include whole file
- `#selection` => include active selection set
- `#comments` => include active comments attached to selections

No implicit auto-inclusion of active selections/comments when not referenced.

### 4) Selection and Comment Semantics

Initial behavior:

- active selection set only (session-local, non-named)

Planned extension:

- named, persistent sets (e.g. `#selection.auth-bug`, `#comments.refactor-pass`)

Comment examples to support:

- “Take a look at #selection and tell me…”
- “#selection looks out of place…”
- “I’ve added #comments as feedback to your changes, please review.”

## Non-Existent File Workflows

Need support for viewing and diffing files that do not yet exist.

Concept direction:

- introduce virtual file buffers (memory-backed or temp-backed),
- allow comparison modes:
  - full view,
  - diff view,
  - inline diff view.

Open question: whether this requires extension support or can be partially native.

## Extension Boundary (Open Decision)

Two possible paths:

### Path A: Core-first

Core app handles most behavior directly, extension optional.

### Path B: Extension-assisted

Advanced features rely on extension/runtime integration:

- virtual file buffers,
- robust `#selection` / `#comments` reference resolution,
- comment-to-steering semantics.

Current decision: **undecided**. Keep both paths documented.

## UX Notes

- Keep interaction keyboard-first.
- Make context preview visible before send.
- Let users remove included context items before dispatch.
- Preserve source provenance for each context item:
  - file path,
  - line ranges,
  - comment anchors,
  - view mode/baseline info for virtual files.

## Risks

- Context overload in prompts.
- Ambiguous selection/comment scope.
- Drift between UI context model and runtime prompt semantics.
- Increased complexity if extension boundary is unclear.

## Mitigations

- Explicit reference-only resolution (`@file`, `#selection`, `#comments`).
- Context preview + pre-send pruning.
- Keep active-only selection model first; add named sets later.
- Separate core and extension responsibilities early in design docs.

## Out of Scope (for this concept iteration)

- Immediate implementation plan.
- Persistence schema for named sets.
- Final extension API contract.
- Multi-user collaborative annotation workflows.

## Follow-Up Design Work

1. Define context object model (`FileContext`, `SelectionContext`, `CommentContext`, `VirtualFileContext`).
2. Define prompt composition grammar and parser behavior for references.
3. Define extension API candidates for virtual buffers and reference resolution.
4. Define deterministic tests for context resolution and diff-mode rendering.
