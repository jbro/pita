import { describe, it, expect } from "vitest";
import { createStubRuntimeAdapter } from "../stubRuntimeAdapter";

describe("StubRuntimeAdapter steer/followUp", () => {
  it("steer() queues a message", () => {
    const adapter = createStubRuntimeAdapter("manual-abort");
    adapter.steer!("fix the bug");
    const result = adapter.clearQueue!();
    expect(result.steering).toEqual(["fix the bug"]);
    expect(result.followUp).toEqual([]);
  });

  it("followUp() queues a message", () => {
    const adapter = createStubRuntimeAdapter("manual-abort");
    adapter.followUp!("then run tests");
    const result = adapter.clearQueue!();
    expect(result.steering).toEqual([]);
    expect(result.followUp).toEqual(["then run tests"]);
  });

  it("clearQueue() drains both queues", () => {
    const adapter = createStubRuntimeAdapter("manual-abort");
    adapter.steer!("a");
    adapter.followUp!("b");
    const first = adapter.clearQueue!();
    expect(first.steering).toEqual(["a"]);
    expect(first.followUp).toEqual(["b"]);
    const second = adapter.clearQueue!();
    expect(second.steering).toEqual([]);
    expect(second.followUp).toEqual([]);
  });

  it("default mode also supports steer/followUp", () => {
    const adapter = createStubRuntimeAdapter("default");
    adapter.steer!("msg");
    expect(adapter.clearQueue!().steering).toEqual(["msg"]);
  });
});
