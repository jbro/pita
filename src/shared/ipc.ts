export const IPC_CHANNELS = {
  ping: "app.ping",
} as const;

export type IpcChannelName = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
