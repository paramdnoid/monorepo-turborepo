import { IPC_CHANNELS } from "@repo/electron";
import { config as loadEnv } from "dotenv";
import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerAuthIpc } from "./auth/auth-service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* API-Runbook-Variablen (AUTH_KEYCLOAK_*) — Desktop lädt sie, falls nur apps/api/.env.local existiert */
loadEnv({ path: path.join(__dirname, "../../api/.env.local") });
loadEnv({ path: path.join(__dirname, "../../api/.env") });
loadEnv({ path: path.join(__dirname, "../.env.local") });
loadEnv({ path: path.join(__dirname, "../.env") });

const require = createRequire(import.meta.url);
const appIconPath = require.resolve("@repo/brand/logo");

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
    icon: appIconPath,
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadRenderer(win);
}

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    app.dock.setIcon(appIconPath);
  }
  ipcMain.handle(IPC_CHANNELS.ping, () => "pong");
  registerAuthIpc();
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
