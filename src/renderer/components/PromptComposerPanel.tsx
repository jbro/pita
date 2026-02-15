import {
  useEffect,
  useRef,
  type KeyboardEvent,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { PromptOverlayRequestEvent, SessionRunState } from "../../shared/ipc";
import { useAtom } from "../store";
import { promptTextAtom, promptOverlayErrorAtom } from "../store/atoms";
import { Card, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";

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

export interface PromptComposerHandle {
  focus: () => void;
}

export const PromptComposerPanel = forwardRef<PromptComposerHandle, PromptComposerPanelProps>(
  function PromptComposerPanel(
    {
      runState = "idle",
      steerCount = 0,
      followUpCount = 0,
      activeConfirmOverlay = null,
      onSend,
      onSteer,
      onFollowUp,
      onAbort,
      onConfirmOverlaySubmit,
      onConfirmOverlayCancel,
    },
    ref
  ): JSX.Element {
    const [text, setText] = useAtom(promptTextAtom);
    const [overlayError, setOverlayError] = useAtom(promptOverlayErrorAtom);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    useEffect(() => {
      setOverlayError(null);
    }, [activeConfirmOverlay?.requestId, setOverlayError]);

    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.style.height = "0px";
      const nextHeight = Math.min(textarea.scrollHeight, 220);
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > 220 ? "auto" : "hidden";
    }, [text]);

    const isRunning = runState === "running" || runState === "aborting";
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
        <Card
          className="fixed bottom-4 left-1/2 z-30 w-[55%] -translate-x-1/2 border-[#2a3244] bg-[#141925]"
          data-testid="prompt-composer-panel"
          aria-label="Prompt composer panel"
        >
          <CardContent className="space-y-3 p-4">
            <h2 className="text-base font-semibold">{activeConfirmOverlay.title}</h2>
            <p className="text-sm text-muted-foreground">{activeConfirmOverlay.message}</p>
            {overlayError ? (
              <p data-testid="confirm-overlay-error" role="alert" className="text-sm text-destructive">
                {overlayError}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" onClick={() => void handleConfirm()}>
                {activeConfirmOverlay.confirmLabel}
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleCancel()}>
                {activeConfirmOverlay.cancelLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    const queueStatus =
      steerCount > 0 || followUpCount > 0
        ? `${steerCount > 0 ? `Steer: ${steerCount}` : ""}${
            steerCount > 0 && followUpCount > 0 ? " · " : ""
          }${followUpCount > 0 ? `Follow-up: ${followUpCount}` : ""}`
        : null;

    return (
      <Card
        className="fixed bottom-4 left-1/2 z-30 w-[55%] -translate-x-1/2 border-[#2a3244] bg-[#141925]"
        data-testid="prompt-composer-panel"
        aria-label="Prompt composer panel"
      >
        <CardContent className="space-y-1.5 p-3">
          <div className="flex items-end gap-2.5">
            <Textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask Pi to continue…"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
              }}
              onKeyDown={handleKeyDown}
              className="max-h-[220px] min-h-[1.6rem] flex-1 resize-none border-0 bg-transparent px-1 py-2 text-foreground focus-visible:ring-0"
            />
            {isRunning ? (
              <div
                className="mb-2 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#3a4254] border-t-[#8ea5ff]"
                aria-label="Agent is busy"
                title="Agent is busy"
              />
            ) : null}
          </div>
          <div className="flex items-center justify-between text-xs text-[#8f98ad]">
            <p>
              {isRunning
                ? "Ctrl+Enter: steer · Alt+Enter: queue follow-up · Esc: cancel"
                : "Ctrl+Enter: send · Esc: clear prompt"}
            </p>
            {queueStatus ? <p>{queueStatus}</p> : null}
          </div>
        </CardContent>
      </Card>
    );
  }
);
