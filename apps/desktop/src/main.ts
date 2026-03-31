import { IPC_CHANNELS } from "@repo/electron";
import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rendererUrl = process.env.DESKTOP_RENDERER_URL;

function loadRenderer(win: BrowserWindow): void {
  if (rendererUrl) {
    void win.loadURL(rendererUrl);
    return;
  }
  win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadRenderer(win);
}

app.whenReady().then(() => {
  ipcMain.handle(IPC_CHANNELS.ping, () => "pong");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
