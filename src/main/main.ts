import { app, BrowserWindow, ipcMain, type BrowserWindowConstructorOptions } from "electron";
import path from "node:path";
import { registerSessionIpc } from "./ipc/sessionIpc";
import { OrchestratorService } from "./orchestrator/OrchestratorService";
import { createStubRuntimeAdapter } from "./runtime/stubRuntimeAdapter";

export function getMainWindowOptions(): BrowserWindowConstructorOptions {
  return {
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "../preload/preload.js")
    }
  };
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow(getMainWindowOptions());

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    window.loadURL(devServerUrl);
  } else {
    window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return window;
}

if (!process.env.VITEST) {
  app.whenReady().then(() => {
    let mainWindow: BrowserWindow | null = null;
    const orchestrator = new OrchestratorService(createStubRuntimeAdapter());

    registerSessionIpc({
      ipcMain,
      orchestrator,
      getTargetWindow: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          return mainWindow;
        }

        return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
      }
    });

    mainWindow = createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
