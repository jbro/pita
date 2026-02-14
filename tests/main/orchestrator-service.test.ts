import { describe, expect, it, vi } from "vitest";
import type { PromptOverlayEvent, PromptOverlayRequestEvent } from "../../src/shared/ipc";
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
    expect(events).toContain("state:idle");
    // After setState dedup, idle is emitted once (by abort), then finally's
    // resetQueueCounts emits queue.status as the last event.
    expect(events.filter((e) => e === "state:idle").length).toBe(1);
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

  it("request registration emits prompt overlay request event", () => {
    const runtime: RuntimeAdapter = {
      run: vi.fn(),
      abort: vi.fn()
    };

    const service = new OrchestratorService(runtime);
    const overlayEvents: PromptOverlayEvent[] = [];

    service.onPromptOverlayEvent((event: PromptOverlayEvent) => {
      overlayEvents.push(event);
    });

    const request: PromptOverlayRequestEvent = {
      type: "prompt_overlay_request",
      requestId: "overlay-1",
      kind: "confirm",
      title: "Confirm",
      message: "Proceed?",
      confirmLabel: "Yes",
      cancelLabel: "No"
    };

    service.requestPromptOverlay(request, vi.fn());

    expect(overlayEvents).toEqual([request]);
  });

  it("submit resolves active request and emits resolved event", () => {
    const resolveOverlay = vi.fn();

    const runtime: RuntimeAdapter = {
      run: vi.fn(),
      abort: vi.fn()
    };

    const service = new OrchestratorService(runtime);
    const overlayEvents: PromptOverlayEvent[] = [];

    service.onPromptOverlayEvent((event: PromptOverlayEvent) => {
      overlayEvents.push(event);
    });

    service.requestPromptOverlay(
      {
        type: "prompt_overlay_request",
        requestId: "overlay-1",
        kind: "confirm",
        title: "Confirm",
        message: "Proceed?",
        confirmLabel: "Yes",
        cancelLabel: "No"
      },
      resolveOverlay
    );

    service.submitPromptOverlay("overlay-1", "confirm");

    expect(resolveOverlay).toHaveBeenCalledWith("confirm");
    expect(overlayEvents.at(-1)).toEqual({
      type: "prompt_overlay_resolved",
      requestId: "overlay-1",
      status: "submitted"
    });
  });

  it("cancel resolves active request with cancelled status", () => {
    const resolveOverlay = vi.fn();

    const runtime: RuntimeAdapter = {
      run: vi.fn(),
      abort: vi.fn()
    };

    const service = new OrchestratorService(runtime);
    const overlayEvents: PromptOverlayEvent[] = [];

    service.onPromptOverlayEvent((event: PromptOverlayEvent) => {
      overlayEvents.push(event);
    });

    service.requestPromptOverlay(
      {
        type: "prompt_overlay_request",
        requestId: "overlay-1",
        kind: "confirm",
        title: "Confirm",
        message: "Proceed?",
        confirmLabel: "Yes",
        cancelLabel: "No"
      },
      resolveOverlay
    );

    service.cancelPromptOverlay("overlay-1");

    expect(resolveOverlay).toHaveBeenCalledWith("cancel");
    expect(overlayEvents.at(-1)).toEqual({
      type: "prompt_overlay_resolved",
      requestId: "overlay-1",
      status: "cancelled"
    });
  });

  it("abort during running emits exactly one idle state transition", async () => {
    let resolveRun: (() => void) | undefined;

    const runtime: RuntimeAdapter = {
      run(_text: string, callbacks: RuntimeCallbacks): Promise<void> {
        callbacks.onStart("msg-1");
        return new Promise<void>((resolve) => {
          resolveRun = resolve;
        });
      },
      abort: vi.fn(() => {
        resolveRun?.();
      })
    };

    const service = new OrchestratorService(runtime);
    const stateEvents: string[] = [];

    service.onTimelineEvent((event) => {
      if (event.type === "state") {
        stateEvents.push(event.state);
      }
    });

    const runPromise = service.sendPrompt("hi");
    await Promise.resolve();

    await service.abort();
    await runPromise;

    const idleCount = stateEvents.filter((s) => s === "idle").length;
    expect(idleCount).toBe(1);
  });

  it("stale requestId submit and cancel are rejected", () => {
    const runtime: RuntimeAdapter = {
      run: vi.fn(),
      abort: vi.fn()
    };

    const service = new OrchestratorService(runtime);

    expect(() => {
      service.submitPromptOverlay("stale-id", "confirm");
    }).toThrow("No active prompt overlay request for requestId stale-id");

    expect(() => {
      service.cancelPromptOverlay("stale-id");
    }).toThrow("No active prompt overlay request for requestId stale-id");
  });
});
