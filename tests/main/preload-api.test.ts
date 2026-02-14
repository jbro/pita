import { describe, expect, it } from "vitest";
import { IPC_CHANNELS } from "../../src/shared/ipc";
import { preloadApi, type PitaSessionApi } from "../../src/shared/preload-api";

describe("preloadApi", () => {
  it("exposes session api members for runtime control", () => {
    expect(preloadApi.pita.version).toBe("stub");
    expect(preloadApi.pita.session).toEqual({
      sendPrompt: expect.any(Function),
      abort: expect.any(Function),
      steer: expect.any(Function),
      followUp: expect.any(Function),
      clearQueue: expect.any(Function),
      onTimelineEvent: expect.any(Function),
      onPromptOverlayEvent: expect.any(Function),
      submitPromptOverlay: expect.any(Function),
      cancelPromptOverlay: expect.any(Function)
    });
  });

  it("declares prompt overlay IPC channel names", () => {
    expect(IPC_CHANNELS.sessionPromptOverlaySubmit).toBe("session.promptOverlaySubmit");
    expect(IPC_CHANNELS.sessionPromptOverlayCancel).toBe("session.promptOverlayCancel");
    expect(IPC_CHANNELS.sessionPromptOverlayEvent).toBe("session.promptOverlayEvent");
  });

  it("reserves prompt overlay method names on PitaSessionApi", () => {
    const overlayMethodNames = [
      "onPromptOverlayEvent",
      "submitPromptOverlay",
      "cancelPromptOverlay"
    ] satisfies ReadonlyArray<keyof PitaSessionApi>;

    expect(overlayMethodNames).toHaveLength(3);
  });
});
