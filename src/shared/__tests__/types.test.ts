import { IPC_CHANNELS } from "../ipc";

describe("IPC_CHANNELS", () => {
  it("defines all project selection channels", () => {
    expect(IPC_CHANNELS).toHaveProperty("appGetHomeDir");
    expect(IPC_CHANNELS).toHaveProperty("fsListDirectory");
    expect(IPC_CHANNELS).toHaveProperty("fsCreateFolder");
    expect(IPC_CHANNELS).toHaveProperty("fsInitProject");
    expect(IPC_CHANNELS).toHaveProperty("projectOpen");
    expect(IPC_CHANNELS).toHaveProperty("projectLoadMru");
  });
});
