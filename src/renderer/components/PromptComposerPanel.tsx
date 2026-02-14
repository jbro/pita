import { useState } from "react";
import type { SessionRunState } from "../../shared/ipc";

interface PromptComposerPanelProps {
  runState?: SessionRunState;
  onSend?: (text: string) => Promise<void>;
  onAbort?: () => Promise<void>;
}

export function PromptComposerPanel({
  runState = "idle",
  onSend,
  onAbort
}: PromptComposerPanelProps): JSX.Element {
  const [text, setText] = useState("");

  const isRunning = runState === "running";

  const handleSend = async (): Promise<void> => {
    const trimmed = text.trim();

    if (!trimmed || isRunning || !onSend) {
      return;
    }

    await onSend(trimmed);
  };

  const handleAbort = async (): Promise<void> => {
    if (!isRunning || !onAbort) {
      return;
    }

    await onAbort();
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
      />
      <div className="composer-actions">
        <button type="button" onClick={handleSend} disabled={isRunning || text.trim().length === 0}>
          Send
        </button>
        <button type="button" onClick={handleAbort} disabled={!isRunning}>
          Abort
        </button>
      </div>
    </section>
  );
}
