/**
 * IPC invoke channel names — keep identical in main process and preload.
 */
export const IPC_CHANNELS = {
  ping: "ping",
  authGetState: "auth:getState",
  authLogin: "auth:login",
  authLogout: "auth:logout",
  authGetAccessToken: "auth:getAccessToken",
  /** Prozess beenden (z. B. nach Abmelden — verhindert erneuten Login-Dialog). */
  quitApp: "app:quit",
} as const;

export type IpcInvokeChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
