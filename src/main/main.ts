import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import { IPC_CHANNELS } from "@shared/ipc";
import { createProjectSelectionHandlers } from "./ipc/projectSelectionIpc";

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "../preload/preload.cjs"),
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    window.loadURL(devServerUrl);
  } else {
    window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return window;
}

app.whenReady().then(() => {
  const pitaDir = path.join(process.env.HOME || "/tmp", ".pita");
  const handlers = createProjectSelectionHandlers(fs, fs.promises as any, pitaDir);

  ipcMain.handle(IPC_CHANNELS.ping, () => "pong");
  ipcMain.handle(IPC_CHANNELS.fsListDirectory, (_, dirPath) => handlers.fsListDirectory(dirPath));
  ipcMain.handle(IPC_CHANNELS.fsCreateFolder, (_, parentPath, name) =>
    handlers.fsCreateFolder(parentPath, name),
  );
  ipcMain.handle(IPC_CHANNELS.fsInitProject, (_, dirPath) => handlers.fsInitProject(dirPath));
  ipcMain.handle(IPC_CHANNELS.projectOpen, (_, projectPath) => handlers.projectOpen(projectPath));
  ipcMain.handle(IPC_CHANNELS.projectLoadMru, () => handlers.projectLoadMru());

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
