import { useEffect, type KeyboardEvent, useState } from "react";
import type { PromptOverlayRequestEvent, SessionRunState } from "../../shared/ipc";

interface PromptComposerPanelProps {
  runState?: SessionRunState;
  steerCount?: number;
  followUpCount?: number;
  activeConfirmOverlay?: PromptOverlayRequestEvent | null;
  onSend?: (text: string) => Promise<void>;
  onSteer?: (text: string) => Promise<void>;
  onFollowUp?: (text: string) => Promise<void>;
  onAbort?: () => Promise<void>;
  onConfirmOverlaySubmit?: (requestId: string) => Promise<void>;
  onConfirmOverlayCancel?: (requestId: string) => Promise<void>;
}

export function PromptComposerPanel({
  runState = "idle",
  steerCount = 0,
  followUpCount = 0,
  activeConfirmOverlay = null,
  onSend,
  onSteer,
  onFollowUp,
  onAbort,
  onConfirmOverlaySubmit,
  onConfirmOverlayCancel
}: PromptComposerPanelProps): JSX.Element {
  const [text, setText] = useState("");
  const [overlayError, setOverlayError] = useState<string | null>(null);

  useEffect(() => {
    setOverlayError(null);
  }, [activeConfirmOverlay?.requestId]);

  const isRunning = runState === "running";
  const trimmed = text.trim();
  const hasText = trimmed.length > 0;
  const pendingCount = steerCount + followUpCount;

  const submitText = async (mode: "send" | "steer" | "followUp"): Promise<void> => {
    if (!hasText) return;

    const value = trimmed;

    if (mode === "steer" && onSteer) {
      await onSteer(value);
    } else if (mode === "followUp" && onFollowUp) {
      await onFollowUp(value);
    } else if (onSend) {
      await onSend(value);
    }
  };

  const handleSend = async (): Promise<void> => {
    if (isRunning) {
      await submitText("steer");
    } else {
      await submitText("send");
    }
  };

  const handleAbort = async (): Promise<void> => {
    if (!isRunning || !onAbort) return;
    await onAbort();
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>): Promise<void> => {
    if (event.key !== "Enter" || !hasText) return;

    if (event.altKey) {
      event.preventDefault();
      if (isRunning) {
        await submitText("followUp");
      } else {
        await submitText("send");
      }
    } else if (!event.shiftKey) {
      event.preventDefault();
      if (isRunning) {
        await submitText("steer");
      } else {
        await submitText("send");
      }
    }
  };

  const handleConfirm = async (): Promise<void> => {
    if (!activeConfirmOverlay || !onConfirmOverlaySubmit) return;

    try {
      await onConfirmOverlaySubmit(activeConfirmOverlay.requestId);
    } catch {
      setOverlayError("Could not submit confirmation. Try again.");
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!activeConfirmOverlay || !onConfirmOverlayCancel) return;

    try {
      await onConfirmOverlayCancel(activeConfirmOverlay.requestId);
    } catch {
      setOverlayError("Could not cancel confirmation. Try again.");
    }
  };

  if (activeConfirmOverlay) {
    return (
      <section
        className="panel composer-panel"
        data-testid="prompt-composer-panel"
        aria-label="Prompt composer panel"
      >
        <h2>{activeConfirmOverlay.title}</h2>
        <p>{activeConfirmOverlay.message}</p>
        {overlayError && (
          <p data-testid="confirm-overlay-error" role="alert">
            {overlayError}
          </p>
        )}
        <div className="composer-actions">
          <button type="button" onClick={() => void handleConfirm()}>
            {activeConfirmOverlay.confirmLabel}
          </button>
          <button type="button" onClick={() => void handleCancel()}>
            {activeConfirmOverlay.cancelLabel}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="panel composer-panel"
      data-testid="prompt-composer-panel"
      aria-label="Prompt composer panel"
    >
      <h2>Prompt Composer</h2>
      <textarea
        placeholder="Ask Pi to continue…"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
        onKeyDown={handleKeyDown}
      />
      <div className="composer-actions">
        {pendingCount > 0 && (
          <span data-testid="pending-count" className="pending-count">
            Steer: {steerCount} · Follow-up: {followUpCount}
          </span>
        )}
        <button type="button" onClick={handleSend} disabled={!hasText}>
          {isRunning ? "Steer" : "Send"}
        </button>
        <button type="button" onClick={handleAbort} disabled={!isRunning}>
          Abort
        </button>
      </div>
    </section>
  );
}
