import { describe, expect, it, vi } from "vitest";
import {
  OrchestratorService,
  type RuntimeAdapter,
  type RuntimeCallbacks
} from "../../src/main/orchestrator/OrchestratorService";

describe("OrchestratorService", () => {
  it("sendPrompt transitions to running and emits normalized stream events", async () => {
    const runtime: RuntimeAdapter = {
      async run(_text: string, callbacks: RuntimeCallbacks): Promise<void> {
        callbacks.onStart("msg-1");
        callbacks.onChunk("msg-1", "hello");
        callbacks.onEnd("msg-1");
      },
      abort: vi.fn()
    };

    const service = new OrchestratorService(runtime);
    const events: string[] = [];

    service.onTimelineEvent((event) => {
      if (event.type === "state") {
        events.push(`state:${event.state}`);
        return;
      }

      events.push(event.type);
    });

    await service.sendPrompt("hi");

    expect(events).toEqual([
      "state:running",
      "response.start",
      "response.chunk",
      "response.end",
      "queue.status",
      "state:idle"
    ]);
  });

  it("abort during running emits abort and returns to idle", async () => {
    let callbacksRef: RuntimeCallbacks | undefined;
    let resolveRun: (() => void) | undefined;

    const runtime: RuntimeAdapter = {
      run(_text: string, callbacks: RuntimeCallbacks): Promise<void> {
        callbacksRef = callbacks;
        callbacks.onStart("msg-1");

        return new Promise<void>((resolve) => {
          resolveRun = resolve;
        });
      },
      abort: vi.fn(() => {
        callbacksRef?.onError(new Error("aborted"));
        resolveRun?.();
      })
    };

    const service = new OrchestratorService(runtime);
    const events: string[] = [];

    service.onTimelineEvent((event) => {
      if (event.type === "state") {
        events.push(`state:${event.state}`);
        return;
      }
      events.push(event.type);
    });

    const runPromise = service.sendPrompt("hi");
    await Promise.resolve();

    await service.abort();
    await runPromise;

    expect(runtime.abort).toHaveBeenCalledTimes(1);
    expect(events).toContain("state:aborting");
    expect(events).toContain("response.abort");
    expect(events.at(-1)).toBe("state:idle");
  });

  it("abort while idle is a safe no-op", async () => {
    const runtime: RuntimeAdapter = {
      run: vi.fn(),
      abort: vi.fn()
    };

    const service = new OrchestratorService(runtime);

    await service.abort();

    expect(runtime.abort).not.toHaveBeenCalled();
  });
});
