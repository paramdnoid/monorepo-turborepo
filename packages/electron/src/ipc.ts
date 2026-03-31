/**
 * IPC invoke channel names — keep identical in main process and preload.
 */
export const IPC_CHANNELS = {
  ping: "ping",
} as const;

export type IpcInvokeChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
