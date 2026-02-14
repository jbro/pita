import { describe, expect, it } from "vitest";
import { IPC_CHANNELS } from "../../src/shared/ipc";

describe("preload ↔ shared IPC channel sync", () => {
  it("preload IPC channel values match shared IPC_CHANNELS", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const preloadSource = fs.readFileSync(
      path.resolve(__dirname, "../../src/preload/preload.ts"),
      "utf-8"
    );

    const sharedChannelValues = Object.values(IPC_CHANNELS);

    for (const channel of sharedChannelValues) {
      expect(
        preloadSource.includes(`"${channel}"`),
        `Preload source is missing channel "${channel}" — sync with src/shared/ipc.ts`
      ).toBe(true);
    }
  });

  it("preload does not reference IPC channels absent from shared contract", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const preloadSource = fs.readFileSync(
      path.resolve(__dirname, "../../src/preload/preload.ts"),
      "utf-8"
    );

    // Extract all string literals that look like IPC channels (dotted names in quotes)
    const channelPattern = /["']session\.\w+["']/g;
    const preloadChannels = [...preloadSource.matchAll(channelPattern)].map((m) =>
      m[0].replace(/['"]/g, "")
    );
    const sharedChannelValues = new Set(Object.values(IPC_CHANNELS));

    for (const channel of preloadChannels) {
      expect(
        sharedChannelValues.has(channel as (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]),
        `Preload references channel "${channel}" not in shared IPC_CHANNELS — remove or add to src/shared/ipc.ts`
      ).toBe(true);
    }
  });
});
