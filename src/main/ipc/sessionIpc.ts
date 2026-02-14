import {
  IPC_CHANNELS,
  type PromptOverlayCancelRequest,
  type PromptOverlaySubmitRequest,
  type SessionFollowUpRequest,
  type SessionSendPromptRequest,
  type SessionSteerRequest
} from "../../shared/ipc";
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

  ipcMain.handle(IPC_CHANNELS.sessionSteer, (_event, payload) => {
    const request = payload as SessionSteerRequest;
    orchestrator.steer(request.text);
  });

  ipcMain.handle(IPC_CHANNELS.sessionFollowUp, (_event, payload) => {
    const request = payload as SessionFollowUpRequest;
    orchestrator.followUp(request.text);
  });

  ipcMain.handle(IPC_CHANNELS.sessionClearQueue, () => {
    return orchestrator.clearQueue();
  });

  ipcMain.handle(IPC_CHANNELS.sessionPromptOverlaySubmit, (_event, payload) => {
    const request = payload as PromptOverlaySubmitRequest;
    orchestrator.submitPromptOverlay(request.requestId, request.decision);
  });

  ipcMain.handle(IPC_CHANNELS.sessionPromptOverlayCancel, (_event, payload) => {
    const request = payload as PromptOverlayCancelRequest;
    orchestrator.cancelPromptOverlay(request.requestId);
  });

  orchestrator.onTimelineEvent((event) => {
    const targetWindow = getTargetWindow();
    targetWindow?.webContents.send(IPC_CHANNELS.sessionTimelineEvent, event);
  });

  orchestrator.onPromptOverlayEvent((event) => {
    const targetWindow = getTargetWindow();
    targetWindow?.webContents.send(IPC_CHANNELS.sessionPromptOverlayEvent, event);
  });
}
