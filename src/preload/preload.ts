import { contextBridge, ipcRenderer } from "electron";

const IPC_CHANNELS = {
  sessionSendPrompt: "session.sendPrompt",
  sessionAbort: "session.abort",
  sessionTimelineEvent: "session.timelineEvent"
} as const;

type SessionTimelineEvent =
  | { type: "state"; state: "idle" | "running" | "aborting" | "error" }
  | { type: "response.start"; messageId: string }
  | { type: "response.chunk"; messageId: string; chunk: string }
  | { type: "response.end"; messageId: string }
  | { type: "response.abort" }
  | { type: "error"; message: string };

contextBridge.exposeInMainWorld("pita", {
  version: "stub",
  session: {
    sendPrompt(text: string): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.sessionSendPrompt, { text });
    },
    abort(): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.sessionAbort);
    },
    onTimelineEvent(listener: (event: SessionTimelineEvent) => void): () => void {
      const handler = (_event: unknown, payload: SessionTimelineEvent) => {
        listener(payload);
      };

      ipcRenderer.on(IPC_CHANNELS.sessionTimelineEvent, handler);

      return () => {
        ipcRenderer.off(IPC_CHANNELS.sessionTimelineEvent, handler);
      };
    }
  }
});
