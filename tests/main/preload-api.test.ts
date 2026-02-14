import { describe, expect, it } from "vitest";
import { preloadApi } from "../../src/shared/preload-api";

describe("preloadApi", () => {
  it("exposes the pita namespace as a stub", () => {
    expect(preloadApi).toEqual({
      pita: {
        version: "stub"
      }
    });
  });
});
