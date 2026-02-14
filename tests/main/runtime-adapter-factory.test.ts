import { describe, expect, it, vi } from "vitest";
import type { RuntimeAdapter } from "../../src/main/orchestrator/OrchestratorService";
import { createRuntimeAdapter } from "../../src/main/runtime/runtimeAdapterFactory";

function createRuntime(): RuntimeAdapter {
  return {
    run: vi.fn(async () => undefined),
    abort: vi.fn()
  };
}

describe("createRuntimeAdapter", () => {
  it("selects SDK runtime by default", async () => {
    const sdkRuntime = createRuntime();
    const stubRuntime = createRuntime();
    const createSdkRuntime = vi.fn(async () => sdkRuntime);
    const createStubRuntime = vi.fn(() => stubRuntime);

    const result = await createRuntimeAdapter({
      env: {},
      createSdkRuntime,
      createStubRuntime
    });

    expect(result.kind).toBe("sdk");
    expect(result.runtime).toBe(sdkRuntime);
    expect(result.startupMessage).toContain("selected=sdk");
    expect(result.startupMessage).toContain("requested=sdk-default");
    expect(result.startupMessage).toContain("fallback=no");
    expect(createStubRuntime).not.toHaveBeenCalled();
  });

  it("selects stub runtime when explicitly configured", async () => {
    const sdkRuntime = createRuntime();
    const stubRuntime = createRuntime();
    const createSdkRuntime = vi.fn(async () => sdkRuntime);
    const createStubRuntime = vi.fn(() => stubRuntime);

    const result = await createRuntimeAdapter({
      env: {
        PITA_RUNTIME_KIND: "stub",
        PITA_STUB_RUNTIME_MODE: "manual-abort"
      },
      createSdkRuntime,
      createStubRuntime
    });

    expect(result.kind).toBe("stub");
    expect(result.runtime).toBe(stubRuntime);
    expect(result.startupMessage).toContain("selected=stub");
    expect(result.startupMessage).toContain("requested=stub");
    expect(result.startupMessage).toContain("stubMode=manual-abort");
    expect(result.startupMessage).toContain("fallback=no");
    expect(createStubRuntime).toHaveBeenCalledWith("manual-abort");
    expect(createSdkRuntime).not.toHaveBeenCalled();
  });

  it("falls back to stub runtime when SDK bootstrap fails", async () => {
    const stubRuntime = createRuntime();

    const result = await createRuntimeAdapter({
      env: {},
      createSdkRuntime: vi.fn(async () => {
        throw new Error("sdk bootstrap failed");
      }),
      createStubRuntime: vi.fn(() => stubRuntime)
    });

    expect(result.kind).toBe("stub");
    expect(result.runtime).toBe(stubRuntime);
    expect(result.fallbackReason).toContain("sdk bootstrap failed");
    expect(result.startupMessage).toContain("selected=stub");
    expect(result.startupMessage).toContain("requested=sdk-default");
    expect(result.startupMessage).toContain("fallback=yes");
    expect(result.startupMessage).toContain("reason=sdk bootstrap failed");
  });
});
