import { app, BrowserWindow, type BrowserWindowConstructorOptions } from "electron";
import path from "node:path";

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
