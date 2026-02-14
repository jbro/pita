import { CommandPalettePlaceholder } from "./components/CommandPalettePlaceholder";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PromptComposerPanel } from "./components/PromptComposerPanel";
import { TimelinePanel, type TimelineItem } from "./components/TimelinePanel";

const timelineItems: TimelineItem[] = [
  { id: "1", role: "user", text: "How does the foreground slot work?" },
  { id: "2", role: "assistant", text: "One worker is attached to the rich UI at a time." },
  { id: "3", role: "tool", text: "git status --short" }
];

export function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <div className="app-shell">
        <header className="app-header">Pita · Phase 1 UI Shell</header>

        <main className="app-main">
          <TimelinePanel items={timelineItems} />
          <CommandPalettePlaceholder />
        </main>

        <PromptComposerPanel />
      </div>
    </ErrorBoundary>
  );
}
