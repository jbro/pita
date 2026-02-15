import { useEffect, useRef } from "react";
import { createCommandRegistry } from "./commands/registry";
import { CommandPalette } from "./components/CommandPalette";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PromptComposerPanel, type PromptComposerHandle } from "./components/PromptComposerPanel";
import { TimelinePanel } from "./components/TimelinePanel";
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
import logoSvg from "../../assets/logo.svg";

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
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
        <header className="app-header">
          <div className="app-header-meta">
            <div>Pita · Phase 1 UI Shell</div>
            <div className="app-header-shortcut-hint">⌘K / Ctrl+K</div>
          </div>
          <img src={logoSvg} alt="Pita logo" className="app-header-logo" />
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
