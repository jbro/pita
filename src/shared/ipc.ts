export const IPC_CHANNELS = {
  ping: "app.ping",
  appGetHomeDir: "app:getHomeDir",
  fsListDirectory: "fs:listDirectory",
  fsCreateFolder: "fs:createFolder",
  fsInitProject: "fs:initProject",
  projectOpen: "project:open",
  projectLoadMru: "project:loadMru",
} as const;

export type IpcChannelName = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
