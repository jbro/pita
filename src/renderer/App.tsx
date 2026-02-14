import { useEffect, useState } from "react";
import { type PromptOverlayEvent, type PromptOverlayRequestEvent } from "../shared/ipc";
import { CommandPalettePlaceholder } from "./components/CommandPalettePlaceholder";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PromptComposerPanel } from "./components/PromptComposerPanel";
import { TimelinePanel } from "./components/TimelinePanel";
import { useSessionTimeline } from "./hooks/useSessionTimeline";

export function App(): JSX.Element {
  const { items, runState, steerCount, followUpCount, addUserMessage } = useSessionTimeline();
  const [activeConfirmOverlay, setActiveConfirmOverlay] =
    useState<PromptOverlayRequestEvent | null>(null);

  useEffect(() => {
    const sessionApi = window.pita?.session;

    if (!sessionApi) {
      return;
    }

    const unsubscribe = sessionApi.onPromptOverlayEvent((event: PromptOverlayEvent) => {
      if (event.type === "prompt_overlay_request" && event.kind === "confirm") {
        setActiveConfirmOverlay(event);
        return;
      }

      if (
        event.type === "prompt_overlay_resolved" &&
        activeConfirmOverlay?.requestId === event.requestId
      ) {
        setActiveConfirmOverlay(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeConfirmOverlay]);

  const handleSend = async (text: string): Promise<void> => {
    addUserMessage(text);
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
          <CommandPalettePlaceholder />
        </main>

        <PromptComposerPanel
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
      </div>
    </ErrorBoundary>
  );
}
