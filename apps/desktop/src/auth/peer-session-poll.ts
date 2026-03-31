import { BrowserWindow } from "electron";

import { getAccessToken, logout } from "./auth-service.js";
import { pollPeerShouldLogout } from "./peer-web-sync.js";

const INTERVAL_MS = 30_000;

async function tick(): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    return;
  }
  if (await pollPeerShouldLogout(token)) {
    await logout();
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.reload();
    }
  }
}

export function startPeerSessionPolling(): void {
  void tick();
  setInterval(() => {
    void tick();
  }, INTERVAL_MS);
}
