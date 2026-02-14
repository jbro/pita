import { describe, expect, it } from "vitest";
import { getMainWindowOptions } from "../../src/main/main";

describe("getMainWindowOptions", () => {
  it("enables renderer sandboxing", () => {
    const options = getMainWindowOptions();

    expect(options.webPreferences?.sandbox).toBe(true);
  });
});
