import { useEffect, useState } from "react";
import {
  type PromptOverlayEvent,
  type PromptOverlayRequestEvent,
  type PromptOverlaySubmitRequest
} from "../shared/ipc";
import { CommandPalettePlaceholder } from "./components/CommandPalettePlaceholder";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PromptComposerPanel } from "./components/PromptComposerPanel";
import { TimelinePanel } from "./components/TimelinePanel";
import { useSessionTimeline } from "./hooks/useSessionTimeline";

export function App(): JSX.Element {
  const { items, runState, steerCount, followUpCount } = useSessionTimeline();
  const [activeConfirmOverlay, setActiveConfirmOverlay] =
    useState<PromptOverlayRequestEvent | null>(null);

  useEffect(() => {
    const unsubscribe = window.pita.session.onPromptOverlayEvent((event: PromptOverlayEvent) => {
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
    const request: PromptOverlaySubmitRequest = { requestId, decision: "confirm" };
    await window.pita.session.submitPromptOverlay(request);
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

        {activeConfirmOverlay ? (
          <section
            className="panel composer-panel"
            data-testid="prompt-composer-panel"
            aria-label="Prompt composer panel"
          >
            <h2>{activeConfirmOverlay.title}</h2>
            <p>{activeConfirmOverlay.message}</p>
            <div className="composer-actions">
              <button
                type="button"
                onClick={() => {
                  void handleConfirmOverlaySubmit(activeConfirmOverlay.requestId);
                }}
              >
                {activeConfirmOverlay.confirmLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleConfirmOverlayCancel(activeConfirmOverlay.requestId);
                }}
              >
                {activeConfirmOverlay.cancelLabel}
              </button>
            </div>
          </section>
        ) : (
          <PromptComposerPanel
            runState={runState}
            steerCount={steerCount}
            followUpCount={followUpCount}
            onSend={handleSend}
            onSteer={handleSteer}
            onFollowUp={handleFollowUp}
            onAbort={handleAbort}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
