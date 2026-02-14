import { describe, it, expect } from "vitest";
import { OrchestratorService, type RuntimeAdapter } from "../OrchestratorService";
import type { SessionTimelineEvent } from "../../../shared/ipc";

function createMockRuntime(): RuntimeAdapter & {
  steered: string[];
  followedUp: string[];
} {
  const steered: string[] = [];
  const followedUp: string[] = [];

  return {
    steered,
    followedUp,
    async run(_text, callbacks) {
      const id = "mock-msg";
      callbacks.onStart(id);
      callbacks.onChunk(id, "chunk");
      callbacks.onEnd(id);
    },
    abort() {},
    steer(text) {
      steered.push(text);
    },
    followUp(text) {
      followedUp.push(text);
    },
    clearQueue() {
      const result = { steering: [...steered.splice(0)], followUp: [...followedUp.splice(0)] };
      return result;
    }
  };
}

describe("OrchestratorService steer/followUp", () => {
  it("steer() delegates to runtime and emits queue.status", () => {
    const runtime = createMockRuntime();
    const orchestrator = new OrchestratorService(runtime);
    const events: SessionTimelineEvent[] = [];
    orchestrator.onTimelineEvent((e) => events.push(e));

    orchestrator.steer("fix it");

    expect(runtime.steered).toEqual(["fix it"]);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "queue.status", steerCount: 1, followUpCount: 0 })
    );
  });

  it("followUp() delegates to runtime and emits queue.status", () => {
    const runtime = createMockRuntime();
    const orchestrator = new OrchestratorService(runtime);
    const events: SessionTimelineEvent[] = [];
    orchestrator.onTimelineEvent((e) => events.push(e));

    orchestrator.followUp("run tests");

    expect(runtime.followedUp).toEqual(["run tests"]);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "queue.status", steerCount: 0, followUpCount: 1 })
    );
  });

  it("clearQueue() returns cleared messages and emits zero status", () => {
    const runtime = createMockRuntime();
    const orchestrator = new OrchestratorService(runtime);
    const events: SessionTimelineEvent[] = [];
    orchestrator.onTimelineEvent((e) => events.push(e));

    orchestrator.steer("a");
    orchestrator.followUp("b");
    const result = orchestrator.clearQueue();

    expect(result).toEqual({ steering: ["a"], followUp: ["b"] });
    const queueEvents = events.filter(
      (e): e is Extract<SessionTimelineEvent, { type: "queue.status" }> => e.type === "queue.status"
    );
    const last = queueEvents[queueEvents.length - 1];
    expect(last!.steerCount).toBe(0);
    expect(last!.followUpCount).toBe(0);
  });

  it("steer() is a no-op when runtime lacks steer method", () => {
    const runtime: RuntimeAdapter = {
      async run(_text, callbacks) {
        callbacks.onStart("m");
        callbacks.onEnd("m");
      },
      abort() {}
    };
    const orchestrator = new OrchestratorService(runtime);
    // Should not throw
    orchestrator.steer("text");
  });

  it("sendPrompt resets queue counts on completion", async () => {
    const runtime = createMockRuntime();
    const orchestrator = new OrchestratorService(runtime);
    const events: SessionTimelineEvent[] = [];
    orchestrator.onTimelineEvent((e) => events.push(e));

    orchestrator.steer("a");
    await orchestrator.sendPrompt("hello");

    const queueEvents = events.filter(
      (e): e is Extract<SessionTimelineEvent, { type: "queue.status" }> => e.type === "queue.status"
    );
    const last = queueEvents[queueEvents.length - 1];
    expect(last!.steerCount).toBe(0);
    expect(last!.followUpCount).toBe(0);
  });
});
