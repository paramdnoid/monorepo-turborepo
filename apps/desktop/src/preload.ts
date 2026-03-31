import { IPC_CHANNELS } from "@repo/electron";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.ping),
  authGetState: () => ipcRenderer.invoke(IPC_CHANNELS.authGetState),
  authLogin: () => ipcRenderer.invoke(IPC_CHANNELS.authLogin),
  authLogout: () => ipcRenderer.invoke(IPC_CHANNELS.authLogout),
  authGetAccessToken: () => ipcRenderer.invoke(IPC_CHANNELS.authGetAccessToken),
  quitApp: () => ipcRenderer.invoke(IPC_CHANNELS.quitApp),
});
