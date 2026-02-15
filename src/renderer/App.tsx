import { useEffect, useRef, useState } from "react";
import { type PromptOverlayEvent, type PromptOverlayRequestEvent } from "../shared/ipc";
import { createCommandRegistry } from "./commands/registry";
import { CommandPalette } from "./components/CommandPalette";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PromptComposerPanel, type PromptComposerHandle } from "./components/PromptComposerPanel";
import { TimelinePanel } from "./components/TimelinePanel";
import { useSessionTimeline } from "./hooks/useSessionTimeline";

export function App(): JSX.Element {
  const {
    items,
    runState,
    steerCount,
    followUpCount,
    addUserMessage,
    addSteerMessage,
    addQueueMessage,
    clearTimeline
  } = useSessionTimeline();
  const [activeConfirmOverlay, setActiveConfirmOverlay] =
    useState<PromptOverlayRequestEvent | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const promptRef = useRef<PromptComposerHandle>(null);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const commands = createCommandRegistry({
    clearTimeline,
    focusPrompt: () => {
      promptRef.current?.focus();
    }
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
    addQueueMessage(text);
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
        <header className="app-header">
          <div className="app-header-meta">
            <div>Pita · Phase 1 UI Shell</div>
            <div className="app-header-shortcut-hint">⌘K / Ctrl+K</div>
          </div>
        </header>

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
