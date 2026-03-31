/**
 * Shape of `contextBridge.exposeInMainWorld("desktop", …)` for renderer typing.
 */
export type DesktopApi = {
  ping: () => Promise<string>;
};
