import { app, BrowserWindow, ipcMain, type BrowserWindowConstructorOptions } from "electron";
import path from "node:path";
import { registerSessionIpc } from "./ipc/sessionIpc";
import {
  OrchestratorService,
  type RuntimeAdapter
} from "./orchestrator/OrchestratorService";

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

function createStubRuntimeAdapter(): RuntimeAdapter {
  return {
    async run(_text, callbacks): Promise<void> {
      const messageId = `msg-${Date.now()}`;
      callbacks.onStart(messageId);
      callbacks.onChunk(messageId, "stub response");
      callbacks.onEnd(messageId);
    },
    abort(): void {
      return;
    }
  };
}

if (!process.env.VITEST) {
  app.whenReady().then(() => {
    const orchestrator = new OrchestratorService(createStubRuntimeAdapter());

    registerSessionIpc({
      ipcMain,
      orchestrator,
      getTargetWindow: () => BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
    });

    createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
