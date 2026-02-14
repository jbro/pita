import { describe, expect, it } from "vitest";
import { preloadApi } from "../../src/shared/preload-api";

describe("preloadApi", () => {
  it("exposes session api members for runtime control", () => {
    expect(preloadApi.pita.version).toBe("stub");
    expect(preloadApi.pita.session).toEqual({
      sendPrompt: expect.any(Function),
      abort: expect.any(Function),
      onTimelineEvent: expect.any(Function)
    });
  });
});
