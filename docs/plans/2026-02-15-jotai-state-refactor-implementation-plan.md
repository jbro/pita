# Jotai State Management Refactoring Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace scattered useState calls with centralized Jotai atoms and action functions to improve testability and create a cleaner state management foundation.

**Architecture:** Create store/ directory with atoms, actions, and event handlers. Components read atoms directly and call action functions instead of managing local state. Event handling moves from hooks to centralized store/events.ts.

**Tech Stack:** React, TypeScript, Jotai, Vitest, Testing Library

---

## Task 1: Install Jotai and Setup Store Infrastructure

**Files:**
- Modify: `package.json`
- Create: `src/renderer/store/index.ts`
- Create: `src/renderer/store/atoms.ts`

**Step 1: Install Jotai**

Run:
```bash
bun add jotai
```

Expected: `jotai` added to dependencies in `package.json`

**Step 2: Verify installation**

Run:
```bash
bun install
```

Expected: Clean install, no errors

**Step 3: Create store infrastructure**

Create `src/renderer/store/index.ts`:

```typescript
import { createStore } from 'jotai';

export const store = createStore();

// Re-export jotai hooks for convenience
export { useAtom, useAtomValue, useSetAtom } from 'jotai';
```

**Step 4: Create atoms file with basic structure**

Create `src/renderer/store/atoms.ts`:

```typescript
import { atom } from 'jotai';
import type { SessionRunState } from '../../shared/ipc';
import type { TimelineItem } from '../components/TimelinePanel';
import type { PromptOverlayRequestEvent } from '../../shared/ipc';

// Timeline domain
export const timelineItemsAtom = atom<TimelineItem[]>([]);
export const runStateAtom = atom<SessionRunState>('idle');
export const steerCountAtom = atom(0);
export const followUpCountAtom = atom(0);

// Prompt domain
export const promptTextAtom = atom('');
export const promptOverlayErrorAtom = atom<string | null>(null);
export const activeConfirmOverlayAtom = atom<PromptOverlayRequestEvent | null>(null);

// Palette domain
export const paletteOpenAtom = atom(false);
export const paletteSearchQueryAtom = atom('');
export const paletteSelectedIndexAtom = atom(0);
```

**Step 5: Verify TypeScript compilation**

Run:
```bash
bun run typecheck
```

Expected: No errors

**Step 6: Commit**

```bash
git add package.json bun.lock src/renderer/store/
git commit -m "feat: add Jotai and create store infrastructure"
```

---

## Task 2: Create Timeline Actions (TDD)

**Files:**
- Create: `src/renderer/store/actions.ts`
- Create: `src/renderer/store/__tests__/actions.test.ts`

**Step 1: Write failing tests for timeline actions**

Create `src/renderer/store/__tests__/actions.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from 'jotai';
import {
  timelineItemsAtom,
  runStateAtom,
  steerCountAtom,
  followUpCountAtom,
} from '../atoms';
import {
  addUserMessage,
  addSteerMessage,
  addFollowUpMessage,
  clearTimeline,
} from '../actions';

describe('Timeline Actions', () => {
  let testStore: ReturnType<typeof createStore>;

  beforeEach(() => {
    testStore = createStore();
  });

  it('addUserMessage adds user message to timeline', () => {
    addUserMessage('hello', testStore);

    const items = testStore.get(timelineItemsAtom);
    expect(items).toHaveLength(1);
    expect(items[0].role).toBe('user');
    expect(items[0].text).toBe('hello');
  });

  it('addSteerMessage adds emphasized steer message', () => {
    addSteerMessage('steer this', testStore);

    const items = testStore.get(timelineItemsAtom);
    expect(items).toHaveLength(1);
    expect(items[0].role).toBe('user');
    expect(items[0].label).toBe('steer');
    expect(items[0].emphasized).toBe(true);
  });

  it('addFollowUpMessage adds follow-up message', () => {
    addFollowUpMessage('follow up', testStore);

    const items = testStore.get(timelineItemsAtom);
    expect(items).toHaveLength(1);
    expect(items[0].role).toBe('user');
    expect(items[0].label).toBe('follow-up');
  });

  it('clearTimeline removes all items', () => {
    addUserMessage('test', testStore);
    expect(testStore.get(timelineItemsAtom)).toHaveLength(1);

    clearTimeline(testStore);

    expect(testStore.get(timelineItemsAtom)).toHaveLength(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
bun run test src/renderer/store/__tests__/actions.test.ts
```

Expected: FAIL with "Cannot find module '../actions'"

**Step 3: Implement timeline actions**

Create `src/renderer/store/actions.ts`:

```typescript
import type { Store } from 'jotai';
import { store as defaultStore } from './index';
import {
  timelineItemsAtom,
  runStateAtom,
  steerCountAtom,
  followUpCountAtom,
  promptTextAtom,
  promptOverlayErrorAtom,
  activeConfirmOverlayAtom,
  paletteOpenAtom,
  paletteSearchQueryAtom,
  paletteSelectedIndexAtom,
} from './atoms';
import type { TimelineItem } from '../components/TimelinePanel';
import type { PromptOverlayRequestEvent, SessionRunState } from '../../shared/ipc';

// Timeline actions

export function addUserMessage(text: string, store: Store = defaultStore): void {
  const current = store.get(timelineItemsAtom);
  const newItem: TimelineItem = {
    id: `user-${Date.now()}`,
    role: 'user',
    text,
  };
  store.set(timelineItemsAtom, [...current, newItem]);
}

export function addSteerMessage(text: string, store: Store = defaultStore): void {
  const current = store.get(timelineItemsAtom);
  const newItem: TimelineItem = {
    id: `steer-${Date.now()}`,
    role: 'user',
    label: 'steer',
    text,
    emphasized: true,
  };
  store.set(timelineItemsAtom, [...current, newItem]);
}

export function addFollowUpMessage(text: string, store: Store = defaultStore): void {
  const current = store.get(timelineItemsAtom);
  const newItem: TimelineItem = {
    id: `followup-${Date.now()}`,
    role: 'user',
    label: 'follow-up',
    text,
    emphasized: true,
  };
  store.set(timelineItemsAtom, [...current, newItem]);
}

export function clearTimeline(store: Store = defaultStore): void {
  store.set(timelineItemsAtom, []);
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
bun run test src/renderer/store/__tests__/actions.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/renderer/store/
git commit -m "feat: add timeline action functions with tests"
```

---

## Task 3: Create Event Handlers (TDD)

**Files:**
- Create: `src/renderer/store/events.ts`
- Create: `src/renderer/store/__tests__/events.test.ts`

**Step 1: Write failing tests for event handlers**

Create `src/renderer/store/__tests__/events.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from 'jotai';
import {
  timelineItemsAtom,
  runStateAtom,
  steerCountAtom,
  followUpCountAtom,
  activeConfirmOverlayAtom,
} from '../atoms';
import { handleTimelineEvent, handlePromptOverlayEvent } from '../events';
import type { SessionTimelineEvent, PromptOverlayEvent } from '../../../shared/ipc';

describe('Event Handlers', () => {
  let testStore: ReturnType<typeof createStore>;

  beforeEach(() => {
    testStore = createStore();
  });

  describe('handleTimelineEvent', () => {
    it('updates runState on state event', () => {
      const event: SessionTimelineEvent = {
        type: 'state',
        state: 'running',
      };

      handleTimelineEvent(event, testStore);

      expect(testStore.get(runStateAtom)).toBe('running');
    });

    it('adds assistant message on response.start', () => {
      const event: SessionTimelineEvent = {
        type: 'response.start',
        messageId: 'msg-1',
      };

      handleTimelineEvent(event, testStore);

      const items = testStore.get(timelineItemsAtom);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('msg-1');
      expect(items[0].role).toBe('assistant');
      expect(items[0].text).toBe('');
    });

    it('appends chunk to existing message on response.chunk', () => {
      // Setup: add initial message
      testStore.set(timelineItemsAtom, [
        { id: 'msg-1', role: 'assistant', text: 'Hello' },
      ]);

      const event: SessionTimelineEvent = {
        type: 'response.chunk',
        messageId: 'msg-1',
        chunk: ' world',
      };

      handleTimelineEvent(event, testStore);

      const items = testStore.get(timelineItemsAtom);
      expect(items[0].text).toBe('Hello world');
    });

    it('updates queue status counts', () => {
      const event: SessionTimelineEvent = {
        type: 'queue.status',
        steerCount: 2,
        followUpCount: 3,
      };

      handleTimelineEvent(event, testStore);

      expect(testStore.get(steerCountAtom)).toBe(2);
      expect(testStore.get(followUpCountAtom)).toBe(3);
    });

    it('handles error event', () => {
      const event: SessionTimelineEvent = {
        type: 'error',
        error: new Error('test error'),
      };

      handleTimelineEvent(event, testStore);

      expect(testStore.get(runStateAtom)).toBe('error');
      const items = testStore.get(timelineItemsAtom);
      expect(items).toHaveLength(1);
      expect(items[0].role).toBe('system');
      expect(items[0].text).toContain('test error');
    });
  });

  describe('handlePromptOverlayEvent', () => {
    it('sets active overlay on prompt_overlay_request', () => {
      const event: PromptOverlayEvent = {
        type: 'prompt_overlay_request',
        requestId: 'req-1',
        kind: 'confirm',
        title: 'Test',
        message: 'Confirm?',
        confirmLabel: 'Yes',
        cancelLabel: 'No',
      };

      handlePromptOverlayEvent(event, testStore);

      const overlay = testStore.get(activeConfirmOverlayAtom);
      expect(overlay).not.toBeNull();
      expect(overlay?.requestId).toBe('req-1');
    });

    it('clears active overlay on prompt_overlay_resolved', () => {
      // Setup: set an active overlay
      testStore.set(activeConfirmOverlayAtom, {
        type: 'prompt_overlay_request',
        requestId: 'req-1',
        kind: 'confirm',
        title: 'Test',
        message: 'Confirm?',
        confirmLabel: 'Yes',
        cancelLabel: 'No',
      });

      const event: PromptOverlayEvent = {
        type: 'prompt_overlay_resolved',
        requestId: 'req-1',
        status: 'submitted',
      };

      handlePromptOverlayEvent(event, testStore);

      expect(testStore.get(activeConfirmOverlayAtom)).toBeNull();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
bun run test src/renderer/store/__tests__/events.test.ts
```

Expected: FAIL with "Cannot find module '../events'"

**Step 3: Implement event handlers**

Create `src/renderer/store/events.ts`:

```typescript
import type { Store } from 'jotai';
import { store as defaultStore } from './index';
import {
  timelineItemsAtom,
  runStateAtom,
  steerCountAtom,
  followUpCountAtom,
  activeConfirmOverlayAtom,
  promptOverlayErrorAtom,
} from './atoms';
import type {
  SessionTimelineEvent,
  PromptOverlayEvent,
  PromptOverlayRequestEvent,
} from '../../shared/ipc';
import type { TimelineItem } from '../components/TimelinePanel';

export function handleTimelineEvent(
  event: SessionTimelineEvent,
  store: Store = defaultStore
): void {
  try {
    switch (event.type) {
      case 'state': {
        store.set(runStateAtom, event.state);
        break;
      }

      case 'response.start': {
        const current = store.get(timelineItemsAtom);
        const newItem: TimelineItem = {
          id: event.messageId,
          role: 'assistant',
          text: '',
        };
        store.set(timelineItemsAtom, [...current, newItem]);
        break;
      }

      case 'response.chunk': {
        const current = store.get(timelineItemsAtom);
        const updated = current.map((item) =>
          item.id === event.messageId
            ? { ...item, text: item.text + event.chunk }
            : item
        );
        store.set(timelineItemsAtom, updated);
        break;
      }

      case 'response.end': {
        // Message already in timeline, just note completion
        break;
      }

      case 'response.abort': {
        const current = store.get(timelineItemsAtom);
        const updated = current.map((item) =>
          item.id === event.messageId
            ? { ...item, text: item.text + '\n\n[aborted]' }
            : item
        );
        store.set(timelineItemsAtom, updated);
        break;
      }

      case 'queue.status': {
        store.set(steerCountAtom, event.steerCount);
        store.set(followUpCountAtom, event.followUpCount);
        break;
      }

      case 'error': {
        store.set(runStateAtom, 'error');
        const current = store.get(timelineItemsAtom);
        const errorItem: TimelineItem = {
          id: `error-${Date.now()}`,
          role: 'system',
          text: `Error: ${event.error.message}`,
        };
        store.set(timelineItemsAtom, [...current, errorItem]);
        break;
      }
    }
  } catch (error) {
    console.error('Failed to handle timeline event:', error);
  }
}

export function handlePromptOverlayEvent(
  event: PromptOverlayEvent,
  store: Store = defaultStore
): void {
  try {
    if (event.type === 'prompt_overlay_request' && event.kind === 'confirm') {
      store.set(activeConfirmOverlayAtom, event as PromptOverlayRequestEvent);
      store.set(promptOverlayErrorAtom, null);
    } else if (event.type === 'prompt_overlay_resolved') {
      const current = store.get(activeConfirmOverlayAtom);
      if (current?.requestId === event.requestId) {
        store.set(activeConfirmOverlayAtom, null);
      }
    }
  } catch (error) {
    console.error('Failed to handle prompt overlay event:', error);
  }
}

export function initializeEventListeners(store: Store = defaultStore): () => void {
  const sessionApi = window.pita?.session;

  if (!sessionApi) {
    console.warn('window.pita.session not available, skipping event listeners');
    return () => {};
  }

  const unsubscribeTimeline = sessionApi.onTimelineEvent((event) => {
    handleTimelineEvent(event, store);
  });

  const unsubscribeOverlay = sessionApi.onPromptOverlayEvent((event) => {
    handlePromptOverlayEvent(event, store);
  });

  return () => {
    unsubscribeTimeline();
    unsubscribeOverlay();
  };
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
bun run test src/renderer/store/__tests__/events.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/renderer/store/
git commit -m "feat: add event handlers with tests"
```

---

## Task 4: Migrate App.tsx to Use Jotai Store

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1: Update App.tsx to use atoms and initialize event listeners**

Replace the imports and state in `src/renderer/App.tsx`:

**Before:**
```typescript
import { useEffect, useRef, useState } from "react";
import { type PromptOverlayEvent, type PromptOverlayRequestEvent } from "../shared/ipc";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PromptComposerPanel } from "./components/PromptComposerPanel";
import { TimelinePanel } from "./components/TimelinePanel";
import { useSessionTimeline } from "./hooks/useSessionTimeline";
```

**After:**
```typescript
import { useEffect, useRef } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PromptComposerPanel } from "./components/PromptComposerPanel";
import { TimelinePanel } from "./components/TimelinePanel";
import { CommandPalette } from "./components/CommandPalette";
import { createCommandRegistry } from "./commands/registry";
import type { PromptComposerHandle } from "./components/PromptComposerPanel";
import { useAtomValue, useSetAtom } from "./store";
import {
  timelineItemsAtom,
  runStateAtom,
  steerCountAtom,
  followUpCountAtom,
  activeConfirmOverlayAtom,
  paletteOpenAtom,
} from "./store/atoms";
import {
  addUserMessage,
  addSteerMessage,
  addFollowUpMessage,
  clearTimeline,
} from "./store/actions";
import { initializeEventListeners } from "./store/events";
```

**Replace the component body:**

```typescript
export function App(): JSX.Element {
  const items = useAtomValue(timelineItemsAtom);
  const runState = useAtomValue(runStateAtom);
  const steerCount = useAtomValue(steerCountAtom);
  const followUpCount = useAtomValue(followUpCountAtom);
  const activeConfirmOverlay = useAtomValue(activeConfirmOverlayAtom);
  const isPaletteOpen = useAtomValue(paletteOpenAtom);
  const setIsPaletteOpen = useSetAtom(paletteOpenAtom);
  
  const promptRef = useRef<PromptComposerHandle>(null);

  useEffect(() => {
    const cleanup = initializeEventListeners();
    return cleanup;
  }, []);

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
  }, [setIsPaletteOpen]);

  const commands = createCommandRegistry({
    clearTimeline: () => clearTimeline(),
    focusPrompt: () => {
      promptRef.current?.focus();
    },
  });

  const handleSend = async (text: string): Promise<void> => {
    addUserMessage(text);
    await window.pita.session.sendPrompt(text);
  };

  const handleSteer = async (text: string): Promise<void> => {
    addSteerMessage(text);
    await window.pita.session.steer(text);
  };

  const handleFollowUp = async (text: string): Promise<void> => {
    addFollowUpMessage(text);
    await window.pita.session.followUp(text);
  };

  const handleAbort = async (): Promise<void> => {
    await window.pita.session.abort();
  };

  const handleConfirmOverlaySubmit = async (requestId: string): Promise<void> => {
    await window.pita.session.submitPromptOverlay({ requestId, decision: "confirm" });
  };

  const handleConfirmOverlayCancel = async (requestId: string): Promise<void> => {
    await window.pita.session.cancelPromptOverlay({ requestId });
  };

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

**Step 2: Run type checking**

Run:
```bash
bun run typecheck
```

Expected: No errors

**Step 3: Run all tests**

Run:
```bash
bun run test
```

Expected: All tests PASS (existing tests should still work)

**Step 4: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "refactor: migrate App.tsx to use Jotai store"
```

---

## Task 5: Migrate PromptComposerPanel to Use Jotai

**Files:**
- Modify: `src/renderer/components/PromptComposerPanel.tsx`

**Step 1: Update PromptComposerPanel to use atoms**

Update imports in `src/renderer/components/PromptComposerPanel.tsx`:

**Add:**
```typescript
import { useAtom, useAtomValue, useSetAtom } from '../store';
import { promptTextAtom, promptOverlayErrorAtom } from '../store/atoms';
```

**Replace state declarations (around line 44-45):**

**Before:**
```typescript
const [text, setText] = useState("");
const [overlayError, setOverlayError] = useState<string | null>(null);
```

**After:**
```typescript
const [text, setText] = useAtom(promptTextAtom);
const [overlayError, setOverlayError] = useAtom(promptOverlayErrorAtom);
```

**Remove the useState import from React import line.**

**Step 2: Run type checking**

Run:
```bash
bun run typecheck
```

Expected: No errors

**Step 3: Run tests**

Run:
```bash
bun run test src/renderer/__tests__/prompt-composer-panel.test.tsx
bun run test src/renderer/__tests__/prompt-composer-runtime.test.tsx
```

Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/renderer/components/PromptComposerPanel.tsx
git commit -m "refactor: migrate PromptComposerPanel to use Jotai atoms"
```

---

## Task 6: Migrate CommandPalette to Use Jotai

**Files:**
- Modify: `src/renderer/components/CommandPalette.tsx`

**Step 1: Update CommandPalette to use atoms**

Update imports in `src/renderer/components/CommandPalette.tsx`:

**Add:**
```typescript
import { useAtom, useAtomValue, useSetAtom } from '../store';
import { paletteSearchQueryAtom, paletteSelectedIndexAtom } from '../store/atoms';
```

**Replace state declarations (around line 16-17):**

**Before:**
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [selectedIndex, setSelectedIndex] = useState(0);
```

**After:**
```typescript
const [searchQuery, setSearchQuery] = useAtom(paletteSearchQueryAtom);
const [selectedIndex, setSelectedIndex] = useAtom(paletteSelectedIndexAtom);
```

**Remove useState from React imports.**

**Step 2: Add atom reset on close**

Update the component to reset search and selection when closed:

Add this useEffect after the existing useEffects (around line 35):

```typescript
useEffect(() => {
  if (!isOpen) {
    // Reset search and selection when palette closes
    setSearchQuery('');
    setSelectedIndex(0);
  }
}, [isOpen, setSearchQuery, setSelectedIndex]);
```

**Step 3: Run type checking**

Run:
```bash
bun run typecheck
```

Expected: No errors

**Step 4: Run tests**

Run:
```bash
bun run test src/renderer/components/__tests__/CommandPalette.test.tsx
bun run test src/renderer/__tests__/command-palette-integration.test.tsx
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/renderer/components/CommandPalette.tsx
git commit -m "refactor: migrate CommandPalette to use Jotai atoms"
```

---

## Task 7: Remove useSessionTimeline Hook

**Files:**
- Delete: `src/renderer/hooks/useSessionTimeline.ts`

**Step 1: Verify no imports of useSessionTimeline remain**

Run:
```bash
grep -r "useSessionTimeline" src/renderer --include="*.tsx" --include="*.ts"
```

Expected: No results (hook is no longer imported anywhere)

**Step 2: Delete the hook file**

Run:
```bash
git rm src/renderer/hooks/useSessionTimeline.ts
```

**Step 3: Run all tests to ensure nothing broke**

Run:
```bash
bun run test
```

Expected: All tests PASS

**Step 4: Run type checking**

Run:
```bash
bun run typecheck
```

Expected: No errors

**Step 5: Commit**

```bash
git commit -m "refactor: remove useSessionTimeline hook (replaced by Jotai store)"
```

---

## Task 8: Update Store Exports

**Files:**
- Modify: `src/renderer/store/index.ts`

**Step 1: Update index.ts to export all public APIs**

Replace contents of `src/renderer/store/index.ts`:

```typescript
import { createStore } from 'jotai';

export const store = createStore();

// Re-export jotai hooks for convenience
export { useAtom, useAtomValue, useSetAtom } from 'jotai';

// Re-export atoms
export * from './atoms';

// Re-export actions
export * from './actions';

// Re-export event handlers
export { initializeEventListeners } from './events';
```

**Step 2: Run type checking**

Run:
```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/renderer/store/index.ts
git commit -m "refactor: consolidate store exports in index.ts"
```

---

## Task 9: Update Tests to Use Jotai Provider

**Files:**
- Modify: `src/renderer/__tests__/app-shell.test.tsx`
- Modify: `src/renderer/__tests__/app-streaming.test.tsx`
- Modify: `src/renderer/__tests__/command-palette-integration.test.tsx`

**Step 1: Update app-shell.test.tsx**

Add Jotai Provider to the test:

```typescript
import { Provider } from 'jotai';
import { store } from '../store';

// Wrap App in Provider:
render(
  <Provider store={store}>
    <App />
  </Provider>
);
```

**Step 2: Update app-streaming.test.tsx**

Replace useSessionTimeline tests with direct store tests:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from 'jotai';
import { timelineItemsAtom } from '../store/atoms';
import { addUserMessage, clearTimeline } from '../store/actions';

describe('Timeline state management', () => {
  let testStore: ReturnType<typeof createStore>;

  beforeEach(() => {
    testStore = createStore();
  });

  it('adds user message to timeline', () => {
    addUserMessage('test message', testStore);

    const items = testStore.get(timelineItemsAtom);
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe('test message');
  });

  it('clears timeline when clear is called', () => {
    addUserMessage('test message', testStore);
    expect(testStore.get(timelineItemsAtom)).toHaveLength(1);

    clearTimeline(testStore);

    expect(testStore.get(timelineItemsAtom)).toHaveLength(0);
  });
});
```

**Step 3: Update command-palette-integration.test.tsx**

Add Provider wrapper:

```typescript
import { Provider } from 'jotai';
import { store } from '../store';

// Wrap App in Provider in all tests:
render(
  <Provider store={store}>
    <App />
  </Provider>
);
```

**Step 4: Run all tests**

Run:
```bash
bun run test
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/renderer/__tests__/
git commit -m "test: update tests to use Jotai Provider and store"
```

---

## Task 10: Run E2E Tests and Manual Verification

**Files:**
- None (verification only)

**Step 1: Run E2E tests**

Run:
```bash
bun run test:e2e
```

Expected: All E2E tests PASS (no behavior changes)

**Step 2: Manual verification checklist**

Run:
```bash
bun run dev
```

Verify:
- [ ] App launches without errors
- [ ] Timeline displays correctly
- [ ] Sending a prompt adds user message to timeline
- [ ] Streaming response updates in real-time
- [ ] Abort stops streaming
- [ ] Steer (Enter while running) queues steer message
- [ ] Follow-up (Alt+Enter while running) queues follow-up
- [ ] Command palette opens with Cmd/Ctrl+K
- [ ] Clear Timeline command works
- [ ] Focus Prompt command works
- [ ] Confirm overlay displays and responds correctly
- [ ] Hot reload works during development

**Step 3: Run full test suite**

Run:
```bash
bun run typecheck
bun run test
bun run test:e2e
```

Expected: All checks PASS

**Step 4: Update roadmap**

Modify `docs/roadmap.md`:

Add after command palette completion:
```markdown
- State management refactored to Jotai (centralized atoms, improved testability).
```

**Step 5: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs: mark Jotai state refactoring as completed"
```

---

## Success Criteria

- [x] Jotai installed and store infrastructure created
- [x] All useState replaced with Jotai atoms
- [x] Timeline actions implemented with tests
- [x] Event handlers centralized in store/events.ts
- [x] App.tsx uses atoms and initializes event listeners
- [x] PromptComposerPanel migrated to atoms
- [x] CommandPalette migrated to atoms
- [x] useSessionTimeline hook removed
- [x] All existing tests pass with no behavior changes
- [x] New atom-level tests cover actions and events
- [x] E2E tests pass
- [x] Manual verification confirms no regressions
- [x] Hot reload works during development
- [x] Type safety maintained throughout

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

## Notes

- Each task is independently committable
- Tests verify behavior at each step
- Can pause/rollback at task boundaries
- Store actions accept optional store parameter for testing
- Event handlers are defensive (catch errors, don't crash)
- Hot reload preserved throughout migration
