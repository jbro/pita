import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type SessionTimelineEvent } from "../shared/ipc";
import { preloadApi } from "../shared/preload-api";

contextBridge.exposeInMainWorld("pita", {
  ...preloadApi.pita,
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
