import { useEffect, useRef, type KeyboardEvent, useState } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setOverlayError(null);
  }, [activeConfirmOverlay?.requestId]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, 220);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 220 ? "auto" : "hidden";
  }, [text]);

  const isRunning = runState === "running";
  const trimmed = text.trim();
  const hasText = trimmed.length > 0;

  const submitText = async (mode: "send" | "steer" | "followUp"): Promise<void> => {
    if (!hasText) return;

    const value = trimmed;
    let action: (() => Promise<void>) | null = null;

    if (mode === "send" && onSend) {
      action = () => onSend(value);
    } else if (mode === "steer" && onSteer) {
      action = () => onSteer(value);
    } else if (mode === "followUp" && onFollowUp) {
      action = () => onFollowUp(value);
    }

    if (!action) return;

    setText("");
    textareaRef.current?.focus();

    await action();
  };

  const handleAbort = async (): Promise<void> => {
    if (!isRunning || !onAbort) return;
    await onAbort();
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>): Promise<void> => {
    if (event.key === "Escape") {
      event.preventDefault();

      if (isRunning) {
        await handleAbort();
      } else {
        setText("");
        textareaRef.current?.focus();
      }

      return;
    }

    if (event.key !== "Enter") return;

    const isAltShortcut = event.altKey || event.getModifierState("AltGraph");
    const isCtrlShortcut = event.ctrlKey || event.metaKey;

    if (!isAltShortcut && !isCtrlShortcut) {
      return;
    }

    if (!hasText) return;

    event.preventDefault();

    if (isAltShortcut) {
      if (isRunning) {
        await submitText("followUp");
      } else {
        await submitText("send");
      }
      return;
    }

    if (isRunning) {
      await submitText("steer");
    } else {
      await submitText("send");
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
      <div className="composer-input-row">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask Pi to continue…"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={handleKeyDown}
        />
        {isRunning && (
          <div className="composer-busy-indicator" aria-label="Agent is busy" title="Agent is busy" />
        )}
      </div>
      <p className="composer-shortcuts">
        {isRunning
          ? "Ctrl+Enter: steer · Alt+Enter: queue follow-up · Esc: cancel"
          : "Ctrl+Enter: send · Esc: clear prompt"}
      </p>
    </section>
  );
}
