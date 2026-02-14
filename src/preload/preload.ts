import { contextBridge, ipcRenderer } from "electron";

const IPC_CHANNELS = {
  sessionSendPrompt: "session.sendPrompt",
  sessionAbort: "session.abort",
  sessionSteer: "session.steer",
  sessionFollowUp: "session.followUp",
  sessionClearQueue: "session.clearQueue",
  sessionTimelineEvent: "session.timelineEvent",
  sessionPromptOverlaySubmit: "session.promptOverlaySubmit",
  sessionPromptOverlayCancel: "session.promptOverlayCancel",
  sessionPromptOverlayEvent: "session.promptOverlayEvent"
} as const;

type SessionTimelineEvent =
  | { type: "state"; state: "idle" | "running" | "aborting" | "error" }
  | { type: "response.start"; messageId: string }
  | { type: "response.chunk"; messageId: string; chunk: string }
  | { type: "response.end"; messageId: string }
  | { type: "response.abort" }
  | { type: "error"; message: string }
  | { type: "queue.status"; steerCount: number; followUpCount: number };

type PromptOverlayEvent =
  | {
      type: "prompt_overlay_request";
      requestId: string;
      kind: "confirm";
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
    }
  | {
      type: "prompt_overlay_resolved";
      requestId: string;
      status: "submitted" | "cancelled" | "expired";
    };

contextBridge.exposeInMainWorld("pita", {
  version: "stub",
  session: {
    sendPrompt(text: string): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.sessionSendPrompt, { text });
    },
    abort(): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.sessionAbort);
    },
    steer(text: string): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.sessionSteer, { text });
    },
    followUp(text: string): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.sessionFollowUp, { text });
    },
    clearQueue(): Promise<{ steering: string[]; followUp: string[] }> {
      return ipcRenderer.invoke(IPC_CHANNELS.sessionClearQueue);
    },
    submitPromptOverlay(request: { requestId: string; decision: "confirm" | "cancel" }): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.sessionPromptOverlaySubmit, request);
    },
    cancelPromptOverlay(request: { requestId: string }): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.sessionPromptOverlayCancel, request);
    },
    onTimelineEvent(listener: (event: SessionTimelineEvent) => void): () => void {
      const handler = (_event: unknown, payload: SessionTimelineEvent) => {
        listener(payload);
      };

      ipcRenderer.on(IPC_CHANNELS.sessionTimelineEvent, handler);

      return () => {
        ipcRenderer.off(IPC_CHANNELS.sessionTimelineEvent, handler);
      };
    },
    onPromptOverlayEvent(listener: (event: PromptOverlayEvent) => void): () => void {
      const handler = (_event: unknown, payload: PromptOverlayEvent) => {
        listener(payload);
      };

      ipcRenderer.on(IPC_CHANNELS.sessionPromptOverlayEvent, handler);

      return () => {
        ipcRenderer.off(IPC_CHANNELS.sessionPromptOverlayEvent, handler);
      };
    }
  }
});
