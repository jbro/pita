# Jotai State Management Refactoring Design

**Date:** 2026-02-15  
**Status:** Approved

## Goal

Replace scattered useState calls with centralized Jotai atoms and action functions. Simplify state management, improve testability, and create a cleaner foundation for UI refactoring.

## Context

Current state management uses multiple useState calls scattered across:
- useSessionTimeline hook (4 state variables)
- PromptComposerPanel (2 state variables)
- CommandPalette (2 state variables)
- App.tsx (2 state variables)

Event handling logic is distributed across hooks and components, making it hard to test and reason about.

## Chosen Approach: Store Actions Pattern

**Strategy:**
- Create atoms for all state
- Add action functions that update atoms
- Move orchestrator event handling into store
- Components call actions instead of local handlers

**Benefits:**
- Centralizes business logic
- Easier to test (pure action functions)
- Reduces component complexity
- Better performance (atomic updates)

**Rationale:**
Do the harder refactoring now while complexity is low. Creates cleaner foundation for future UI refactoring.

## Store Architecture

**Store Structure:**

```
src/renderer/store/
  atoms.ts         # All atom definitions
  actions.ts       # State update functions
  events.ts        # Event handlers (orchestrator events → atom updates)
  index.ts         # Public API exports
```

**Core Atoms:**
```typescript
// Timeline domain
export const timelineItemsAtom = atom<TimelineItem[]>([])
export const runStateAtom = atom<SessionRunState>('idle')
export const steerCountAtom = atom(0)
export const followUpCountAtom = atom(0)

// Prompt domain
export const promptTextAtom = atom('')
export const promptOverlayErrorAtom = atom<string | null>(null)
export const activeConfirmOverlayAtom = atom<PromptOverlayRequestEvent | null>(null)

// Palette domain
export const paletteOpenAtom = atom(false)
export const paletteSearchQueryAtom = atom('')
export const paletteSelectedIndexAtom = atom(0)
```

**Action Functions:**
```typescript
// User actions
export const addUserMessage = (text: string) => { /* updates atoms */ }
export const clearTimeline = () => { /* updates atoms */ }
export const openPalette = () => { /* updates atoms */ }
```

**Event Handlers:**
```typescript
// Orchestrator event → atom updates
export const handleTimelineEvent = (event: SessionTimelineEvent) => {
  // Centralized logic that was scattered across components
}
```

## Component Integration Pattern

**Hook Replacement:**

**Before (useSessionTimeline):**
```typescript
const { items, runState, addUserMessage, clearTimeline } = useSessionTimeline()
```

**After (direct atom usage):**
```typescript
const items = useAtomValue(timelineItemsAtom)
const runState = useAtomValue(runStateAtom)
// Actions imported as functions:
import { addUserMessage, clearTimeline } from '@/store'
```

**Event Subscription:**

Move from hooks to a single event subscription service:

```typescript
// store/events.ts
export function initializeEventListeners() {
  const sessionApi = window.pita?.session
  
  if (!sessionApi) return
  
  sessionApi.onTimelineEvent((event) => {
    handleTimelineEvent(event) // Updates atoms
  })
  
  sessionApi.onPromptOverlayEvent((event) => {
    handlePromptOverlayEvent(event) // Updates atoms
  })
}
```

Called once in App.tsx on mount.

**Action Pattern:**

Actions use Jotai's store API to update atoms:

```typescript
import { store } from './store'

export const addUserMessage = (text: string) => {
  const current = store.get(timelineItemsAtom)
  store.set(timelineItemsAtom, [
    ...current,
    { id: `user-${Date.now()}`, role: 'user', text }
  ])
}
```

**Component Simplification:**
- No more hooks managing multiple useState
- No more complex event handling in components
- Just read atoms and call actions

## Migration Strategy

**Incremental Migration Order:**

**Phase 1: Setup Infrastructure**
- Install Jotai
- Create store structure (atoms.ts, actions.ts, events.ts)
- Define all atoms
- Set up store instance

**Phase 2: Migrate Timeline State**
- Convert useSessionTimeline to atoms + actions
- Move event handling to store/events.ts
- Update App.tsx to use atoms
- Update TimelinePanel to use atoms
- Remove useSessionTimeline hook

**Phase 3: Migrate Prompt State**
- Convert PromptComposerPanel useState to atoms
- Create prompt actions
- Update component to use atoms

**Phase 4: Migrate Palette & Overlay State**
- Convert CommandPalette useState to atoms
- Convert App.tsx overlay state to atoms
- Create palette actions
- Initialize event listeners once in App

**Phase 5: Cleanup**
- Remove all useState imports from migrated components
- Remove useSessionTimeline.ts file
- Verify all tests pass
- Update any broken tests

**Rollback Safety:**
- Each phase is independently committable
- Tests verify behavior at each step
- Can pause/rollback at phase boundaries

## Testing Strategy

**Atom Testing (New):**

Test atoms in isolation without React:

```typescript
// store/__tests__/timeline.test.ts
import { createStore } from 'jotai'
import { timelineItemsAtom, addUserMessage } from '../timeline'

test('addUserMessage adds item to timeline', () => {
  const store = createStore()
  
  addUserMessage('hello')
  
  const items = store.get(timelineItemsAtom)
  expect(items).toHaveLength(1)
  expect(items[0].text).toBe('hello')
})
```

**Event Handler Testing:**

Test event handling logic without components:

```typescript
// store/__tests__/events.test.ts
test('handleTimelineEvent updates runState', () => {
  const store = createStore()
  
  handleTimelineEvent({ type: 'state', state: 'running' })
  
  expect(store.get(runStateAtom)).toBe('running')
})
```

**Component Testing:**

Components become simpler to test (mock atoms, not complex hooks):

```typescript
// App.test.tsx
import { useSetAtom } from 'jotai'

test('renders timeline items', () => {
  const TestApp = () => {
    const setItems = useSetAtom(timelineItemsAtom)
    
    useEffect(() => {
      setItems([{ id: '1', role: 'user', text: 'test' }])
    }, [])
    
    return <App />
  }
  
  render(<TestApp />)
  expect(screen.getByText('test')).toBeInTheDocument()
})
```

**Migration Testing Approach:**

For each phase:
1. Write failing tests for new atom behavior
2. Implement atoms + actions
3. Update component to use atoms
4. Verify existing component tests still pass (behavior unchanged)
5. Add new atom-level tests

**Test Coverage Goals:**
- All actions have unit tests
- All event handlers have unit tests
- Component tests verify atom integration
- Existing E2E tests confirm no regression

## Error Handling & Edge Cases

**Error Handling:**

**Action errors:**
```typescript
export const addUserMessage = (text: string) => {
  try {
    const current = store.get(timelineItemsAtom)
    store.set(timelineItemsAtom, [...current, createUserMessage(text)])
  } catch (error) {
    console.error('Failed to add user message:', error)
    // Atoms remain in consistent state (no partial updates)
  }
}
```

**Event handler errors:**
- Wrap event handlers in try/catch
- Log errors but don't crash app
- Invalid events are ignored (defensive)

**Edge Cases:**

**No window.pita:**
- Event listener initialization checks for API
- Returns early if missing (dev/test environments)
- Components work with empty atoms

**Rapid state updates:**
- Jotai handles batching automatically
- No race conditions (synchronous atom updates)
- Event order preserved

**Hot reload during migration:**
- Store initialized once per app lifecycle
- Atoms reset on hot reload (expected dev behavior)
- No state persistence needed for V1

**Migration rollback:**
- Each phase commits independently
- Can revert individual commits
- Tests verify behavior at each checkpoint

**Store initialization:**
- Create store instance in store/index.ts
- Export singleton for actions to use
- Initialize event listeners once in App useEffect

## Success Criteria

- All useState replaced with Jotai atoms
- Event handling centralized in store/events.ts
- All existing tests pass with no behavior changes
- New atom-level tests cover actions and event handlers
- Components simplified (read atoms + call actions)
- Hot reload works during development
- Type safety maintained throughout

## Dependencies

- Add: `jotai` (~3KB gzipped)
- Keep: All existing dependencies
- Remove: None (this is pure refactoring)
