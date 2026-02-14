import { CommandPalettePlaceholder } from "./components/CommandPalettePlaceholder";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PromptComposerPanel } from "./components/PromptComposerPanel";
import { TimelinePanel } from "./components/TimelinePanel";
import { useSessionTimeline } from "./hooks/useSessionTimeline";

export function App(): JSX.Element {
  const { items, runState, steerCount, followUpCount } = useSessionTimeline();

  const handleSend = async (text: string): Promise<void> => {
    await window.pita.session.sendPrompt(text);
  };

  const handleSteer = async (text: string): Promise<void> => {
    await window.pita.session.steer(text);
  };

  const handleFollowUp = async (text: string): Promise<void> => {
    await window.pita.session.followUp(text);
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

        <PromptComposerPanel
          runState={runState}
          steerCount={steerCount}
          followUpCount={followUpCount}
          onSend={handleSend}
          onSteer={handleSteer}
          onFollowUp={handleFollowUp}
          onAbort={handleAbort}
        />
      </div>
    </ErrorBoundary>
  );
}
