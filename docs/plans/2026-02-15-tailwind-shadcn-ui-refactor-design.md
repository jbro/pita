# Tailwind + shadcn/ui Refactoring Design

**Date:** 2026-02-15  
**Status:** Approved

## Goal

Replace custom CSS and hand-rolled components with Tailwind utility classes and shadcn/ui components. Improve accessibility, reduce maintenance burden, and create a foundation for rich collapsible UI (thinking blocks, tool outputs, diffs).

## Context

Current UI uses custom CSS (~400 lines) and hand-rolled components (CommandPalette, PromptComposerPanel, TimelinePanel). This requires manual accessibility work, custom keyboard navigation, and grows harder to maintain as features are added.

Upcoming features (thinking blocks, editable tool outputs, diffs) will need collapsible cards with rich nested content. shadcn/ui provides this out of the box.

## Chosen Approach: Full shadcn/ui Migration

**Strategy:**
- Run `npx shadcn@latest init` for Tailwind + shadcn setup
- Replace all three UI components with shadcn equivalents
- Delete custom CSS, use Tailwind utilities
- Class-based dark mode (default: dark)
- Install required + nice-to-have components for future use

**Benefits:**
- Accessible components by default
- Less code to maintain
- Foundation for collapsible cards
- Better keyboard navigation
- Consistent design system

**Rationale:**
Going all-in on Tailwind + shadcn now (while codebase is small) sets up a clean foundation for Phase 2+ features. shadcn's collapsible cards are perfect for thinking blocks and tool outputs.

## Architecture Overview

**Migration Goals:**
- Replace custom CSS with Tailwind utility classes
- Replace hand-rolled components with shadcn/ui components
- Maintain all current functionality (no behavior changes)
- Set up foundation for collapsible cards (thinking blocks, tool outputs)

**File Structure Changes:**

```
src/renderer/
  components/
    ui/                    # NEW: shadcn components live here
      command.tsx
      scroll-area.tsx
      card.tsx
      textarea.tsx
      button.tsx
      collapsible.tsx
      separator.tsx
      badge.tsx
    CommandPalette.tsx     # MIGRATE: Use ui/command
    PromptComposerPanel.tsx # MIGRATE: Use ui/textarea, ui/card
    TimelinePanel.tsx      # MIGRATE: Use ui/scroll-area, ui/card
    ErrorBoundary.tsx      # KEEP: No changes
  styles.css               # REPLACE: Minimal globals only
  tailwind.config.ts       # NEW: Tailwind configuration
```

**shadcn Configuration:**
- Class-based dark mode (default: dark)
- CSS variables for theme colors
- Zinc color palette (neutral, works well for dev tools)
- Border radius: medium (0.5rem default)

**Dependencies Added:**
- `tailwindcss`
- `tailwindcss-animate`
- `class-variance-authority` (for shadcn component variants)
- `clsx` + `tailwind-merge` (for className utilities)
- `lucide-react` (icon library shadcn uses)

**Dependencies Removed:**
- `fuse.js` (shadcn Command has built-in search)

## Component Migration Strategy

### CommandPalette → Command Component

**Before:** Custom modal + fuzzy search + keyboard nav  
**After:** shadcn `Command` component (built for this exact use case)

**Benefits:**
- Built-in keyboard navigation (arrows, Enter, Esc)
- Built-in fuzzy search
- Accessible (ARIA labels, focus management)
- Modal backdrop included
- Less code to maintain

**Integration:**
```typescript
<Command.Dialog open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
  <Command.Input placeholder="Search commands..." />
  <Command.List>
    <Command.Group heading="Actions">
      <Command.Item onSelect={() => clearTimeline()}>
        Clear Timeline
      </Command.Item>
      <Command.Item onSelect={() => focusPrompt()}>
        Focus Prompt
      </Command.Item>
    </Command.Group>
  </Command.List>
</Command.Dialog>
```

### PromptComposerPanel → Textarea + Card

**Before:** Custom textarea with overlay states  
**After:** shadcn `Textarea` in `Card` container

**Benefits:**
- Consistent input styling
- Better accessibility
- Auto-resize built-in (via Textarea component)
- Card provides structured layout for shortcuts, overlays

**Structure:**
```typescript
<Card className="prompt-composer">
  <CardContent>
    {activeConfirmOverlay ? (
      <ConfirmOverlay /> // Card with buttons
    ) : (
      <Textarea 
        placeholder="Send a message..."
        onKeyDown={handleKeyboard}
      />
    )}
    <div className="shortcuts-hint">...</div>
  </CardContent>
</Card>
```

### TimelinePanel → ScrollArea + Card Messages

**Before:** Custom scroll container + div messages  
**After:** shadcn `ScrollArea` with `Card` for each message

**Benefits:**
- Smooth scrolling behavior
- Auto-scroll to bottom
- Cards provide structure for future collapsible content
- Ready for thinking blocks, tool outputs, diffs

**Structure:**
```typescript
<ScrollArea className="timeline">
  {items.map(item => (
    <Card key={item.id} className={`message-${item.role}`}>
      <CardHeader>
        <CardTitle>{item.role}</CardTitle>
      </CardHeader>
      <CardContent>
        {item.text}
      </CardContent>
    </Card>
  ))}
</ScrollArea>
```

## Migration Phases

**Phase 1: Setup Tailwind + shadcn/ui**
- Install dependencies (Tailwind, shadcn CLI dependencies)
- Run `npx shadcn@latest init` (configure for dark mode, zinc palette)
- Add shadcn components: command, scroll-area, card, textarea, button, collapsible, separator, badge
- Configure `tailwind.config.ts` for proper paths
- Set dark mode class on root element
- Verify build works

**Phase 2: Migrate CommandPalette**
- Replace custom CommandPalette with shadcn Command component
- Remove fuse.js dependency (Command has built-in search)
- Update command registry to work with Command.Item structure
- Remove custom palette CSS
- Verify keyboard shortcuts work (Cmd/Ctrl+K)
- Test fuzzy search, navigation, execution

**Phase 3: Migrate PromptComposerPanel**
- Replace custom textarea with shadcn Textarea
- Wrap in Card component
- Style confirm overlay with Card + Button components
- Remove prompt composer custom CSS
- Preserve keyboard behavior (Enter for newline, Ctrl+Enter for send, etc.)
- Test overlay states, shortcuts, auto-resize

**Phase 4: Migrate TimelinePanel**
- Replace custom scroll container with ScrollArea
- Wrap each message in Card component
- Add CardHeader for role/metadata
- Remove timeline custom CSS
- Test streaming updates, auto-scroll
- Verify message rendering

**Phase 5: Global Styles Cleanup**
- Replace `styles.css` with minimal globals (CSS reset, app shell)
- Move component styles to Tailwind utilities
- Remove unused CSS
- Verify dark theme consistency
- Test hot reload

**Phase 6: Cleanup**
- Remove fuse.js dependency (no longer needed)
- Remove unused custom components
- Run full test suite
- Update E2E tests if needed
- Manual verification

**Rollback Safety:**
- Each phase is independently committable
- Can pause/rollback at phase boundaries
- Tests verify behavior at each step

## Testing Strategy

**Component Testing:**

**CommandPalette tests:**
- Verify Command component opens/closes
- Test keyboard navigation (arrows, Enter, Esc)
- Test command execution
- Test search filtering (built-in, not fuse.js)
- Mock Jotai atoms for state

**PromptComposerPanel tests:**
- Verify Textarea renders and accepts input
- Test keyboard shortcuts (Ctrl+Enter, Esc, etc.)
- Test overlay states (confirm overlay replacement)
- Test auto-resize behavior
- Mock Jotai atoms for prompt text

**TimelinePanel tests:**
- Verify ScrollArea renders messages
- Test Card components display correctly
- Test role-based styling
- Test streaming updates (append to existing message)
- Mock Jotai atoms for timeline items

**Integration Testing:**

Update existing integration tests:
- `command-palette-integration.test.tsx` - Verify Command component works with Jotai store
- `app-streaming.test.tsx` - Verify Timeline updates during streaming
- App-level tests - Verify all components work together

**E2E Testing:**

Update `ui-shell.smoke.spec.ts`:
- Verify command palette opens with Cmd/Ctrl+K
- Verify prompt sends messages
- Verify timeline displays messages
- Verify overlay states work

**Visual Regression:**
- Manual smoke test checklist for dark theme
- Verify component spacing, colors, typography
- Test hot reload preserves styles

**Migration Testing Approach:**

For each phase:
1. Migrate component to shadcn
2. Update component tests (if needed)
3. Run component tests - verify pass
4. Run integration tests - verify pass
5. Run E2E tests - verify pass
6. Manual visual check
7. Commit

## Error Handling & Edge Cases

**Error Handling:**

**shadcn init failures:**
- If init fails, rollback and try manual Tailwind setup
- Document any config conflicts
- Verify Vite compatibility

**Component installation:**
- If `npx shadcn@latest add` fails, manually copy components from shadcn source
- Verify each component compiles before proceeding

**Style conflicts:**
- Tailwind may conflict with existing CSS during transition
- Use `!important` sparingly during migration if needed
- Remove as custom CSS is eliminated

**Build errors:**
- Tailwind purge may remove needed classes
- Configure `content` paths in tailwind.config.ts to include all source files
- Test production build after each phase

**Edge Cases:**

**Cmd/Ctrl+K still opens palette:**
- shadcn Command has built-in keyboard trigger
- Disable our custom global listener after migration
- Let Command component handle it

**Auto-resize textarea:**
- shadcn Textarea doesn't auto-resize by default
- Add auto-resize logic or use shadcn's autosize prop
- Test with long/short input

**Streaming timeline updates:**
- ScrollArea needs explicit scroll-to-bottom on new messages
- Add ref + scrollIntoView logic after message append
- Test rapid streaming doesn't break scroll

**Hot reload during migration:**
- Tailwind JIT may cause style flicker during development
- Normal behavior, not a bug
- Verify styles load correctly on refresh

**Dark mode class initialization:**
- Set `dark` class on `<html>` element in index.html
- Or set programmatically in main.tsx
- Ensure set before first render to avoid flash

**Component prop compatibility:**
- shadcn components may have different prop names
- Map our existing props to shadcn equivalents
- Document any behavior changes

**Accessibility:**
- shadcn components are accessible by default
- Preserve ARIA labels from custom components
- Test keyboard navigation still works

## Success Criteria

- Tailwind + shadcn/ui fully configured
- All three components migrated to shadcn equivalents
- Custom CSS replaced with Tailwind utilities
- Dark theme consistent throughout
- All existing tests pass with no behavior changes
- E2E tests confirm no regressions
- Hot reload works during development
- Type safety maintained
- fuse.js dependency removed
- Foundation set for collapsible cards (Phase 2)

## shadcn Components to Install

**Required:**
- `command` - CommandPalette replacement
- `scroll-area` - Timeline scrolling
- `card` - Message containers, prompt composer structure
- `textarea` - Prompt input
- `button` - Overlay actions, future controls

**Nice-to-have (future-ready):**
- `collapsible` - Thinking blocks, tool outputs
- `separator` - Visual dividers
- `badge` - Queue counts, labels

Install all components during Phase 1 setup.
