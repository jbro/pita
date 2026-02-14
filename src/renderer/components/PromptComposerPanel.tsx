import { type KeyboardEvent, useState } from "react";
import type { SessionRunState } from "../../shared/ipc";

interface PromptComposerPanelProps {
  runState?: SessionRunState;
  steerCount?: number;
  followUpCount?: number;
  onSend?: (text: string) => Promise<void>;
  onSteer?: (text: string) => Promise<void>;
  onFollowUp?: (text: string) => Promise<void>;
  onAbort?: () => Promise<void>;
}

export function PromptComposerPanel({
  runState = "idle",
  steerCount = 0,
  followUpCount = 0,
  onSend,
  onSteer,
  onFollowUp,
  onAbort
}: PromptComposerPanelProps): JSX.Element {
  const [text, setText] = useState("");

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
            {pendingCount} queued
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
