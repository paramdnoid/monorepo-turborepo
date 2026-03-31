import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  ping: (): Promise<string> => ipcRenderer.invoke("ping"),
});
