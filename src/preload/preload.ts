import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/ipc";

contextBridge.exposeInMainWorld("pita", {
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.ping),
  fs: {
    listDirectory: (dirPath: string) => ipcRenderer.invoke(IPC_CHANNELS.fsListDirectory, dirPath),
    createFolder: (parentPath: string, name: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.fsCreateFolder, parentPath, name),
    initProject: (dirPath: string) => ipcRenderer.invoke(IPC_CHANNELS.fsInitProject, dirPath),
  },
  project: {
    open: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.projectOpen, projectPath),
    loadMru: () => ipcRenderer.invoke(IPC_CHANNELS.projectLoadMru),
  },
});
