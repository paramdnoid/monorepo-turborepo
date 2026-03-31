import { IPC_CHANNELS } from "@repo/electron";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.ping),
});
