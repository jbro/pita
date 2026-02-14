import { CommandPalettePlaceholder } from "./components/CommandPalettePlaceholder";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PromptComposerPanel } from "./components/PromptComposerPanel";
import { TimelinePanel } from "./components/TimelinePanel";
import { useSessionTimeline } from "./hooks/useSessionTimeline";

export function App(): JSX.Element {
  const { items, runState } = useSessionTimeline();

  const handleSend = async (text: string): Promise<void> => {
    await window.pita.session.sendPrompt(text);
  };

  const handleAbort = async (): Promise<void> => {
    await window.pita.session.abort();
  };

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <header className="app-header">Pita · Phase 1 UI Shell</header>

        <main className="app-main">
          <TimelinePanel items={items} />
          <CommandPalettePlaceholder />
        </main>

        <PromptComposerPanel runState={runState} onSend={handleSend} onAbort={handleAbort} />
      </div>
    </ErrorBoundary>
  );
}
