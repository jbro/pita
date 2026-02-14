import { IPC_CHANNELS, type SessionSendPromptRequest } from "../../shared/ipc";
import type { OrchestratorService } from "../orchestrator/OrchestratorService";

interface IpcMainLike {
  handle(
    channel: string,
    listener: (event: unknown, payload?: unknown) => Promise<unknown> | unknown
  ): void;
}

interface WindowLike {
  webContents: {
    send(channel: string, payload: unknown): void;
  };
}

export interface RegisterSessionIpcOptions {
  ipcMain: IpcMainLike;
  orchestrator: OrchestratorService;
  getTargetWindow: () => WindowLike | null;
}

export function registerSessionIpc(options: RegisterSessionIpcOptions): void {
  const { ipcMain, orchestrator, getTargetWindow } = options;

  ipcMain.handle(IPC_CHANNELS.sessionSendPrompt, async (_event, payload) => {
    const request = payload as SessionSendPromptRequest;
    await orchestrator.sendPrompt(request.text);
  });

  ipcMain.handle(IPC_CHANNELS.sessionAbort, async () => {
    await orchestrator.abort();
  });

  orchestrator.onTimelineEvent((event) => {
    const targetWindow = getTargetWindow();
    targetWindow?.webContents.send(IPC_CHANNELS.sessionTimelineEvent, event);
  });
}
