import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/ipc";

contextBridge.exposeInMainWorld("pita", {
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.ping),
});
