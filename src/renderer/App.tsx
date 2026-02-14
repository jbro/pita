import { CommandPalettePlaceholder } from "./components/CommandPalettePlaceholder";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PromptComposerPanel } from "./components/PromptComposerPanel";
import { TimelinePanel } from "./components/TimelinePanel";
import { useSessionTimeline } from "./hooks/useSessionTimeline";

export function App(): JSX.Element {
  const { items } = useSessionTimeline();

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <header className="app-header">Pita · Phase 1 UI Shell</header>

        <main className="app-main">
          <TimelinePanel items={items} />
          <CommandPalettePlaceholder />
        </main>

        <PromptComposerPanel />
      </div>
    </ErrorBoundary>
  );
}
