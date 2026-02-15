import type {
  PromptOverlayEvent,
  PromptOverlayRequestEvent,
  SessionRunState,
  SessionTimelineEvent
} from "../../shared/ipc";

export interface RuntimeCallbacks {
  onStart(messageId: string): void;
  onChunk(messageId: string, chunk: string): void;
  onEnd(messageId: string): void;
  onError(error: Error): void;
}

export type PromptOverlayDecision = "confirm" | "cancel";
export type PromptOverlayResolver = (decision: PromptOverlayDecision) => void;
export type PromptOverlayRequestListener = (
  request: PromptOverlayRequestEvent,
  resolve: PromptOverlayResolver
) => void;

export interface RuntimeAdapter {
  run(text: string, callbacks: RuntimeCallbacks): Promise<void>;
  abort(): Promise<void> | void;
  steer?(text: string): void;
  followUp?(text: string): void;
  clearQueue?(): { steering: string[]; followUp: string[] };
  onPromptOverlayRequest?(listener: PromptOverlayRequestListener): () => void;
}

type TimelineListener = (event: SessionTimelineEvent) => void;
type PromptOverlayListener = (event: PromptOverlayEvent) => void;

export class OrchestratorService {
  private state: SessionRunState = "idle";
  private steerCount = 0;
  private followUpCount = 0;
  private activeRunPromise: Promise<void> | undefined;
  private readonly listeners = new Set<TimelineListener>();
  private readonly promptOverlayListeners = new Set<PromptOverlayListener>();
  private activePromptOverlay:
    | {
        request: PromptOverlayRequestEvent;
        resolve: PromptOverlayResolver;
      }
    | undefined;

  public constructor(private readonly runtime: RuntimeAdapter) {
    this.runtime.onPromptOverlayRequest?.((request, resolve) => {
      this.requestPromptOverlay(request, resolve);
    });
  }

  public onTimelineEvent(listener: TimelineListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public onPromptOverlayEvent(listener: PromptOverlayListener): () => void {
    this.promptOverlayListeners.add(listener);

    return () => {
      this.promptOverlayListeners.delete(listener);
    };
  }

  public requestPromptOverlay(request: PromptOverlayRequestEvent, resolve: PromptOverlayResolver = () => undefined): void {
    if (this.activePromptOverlay) {
      throw new Error(`Prompt overlay request ${request.requestId} rejected: another request is already active.`);
    }

    this.activePromptOverlay = { request, resolve };
    this.emitPromptOverlay(request);
  }

  public submitPromptOverlay(requestId: string, decision: PromptOverlayDecision): void {
    const activeRequest = this.activePromptOverlay;

    if (!activeRequest || activeRequest.request.requestId !== requestId) {
      throw new Error(`No active prompt overlay request for requestId ${requestId}`);
    }

    activeRequest.resolve(decision);
    this.activePromptOverlay = undefined;
    this.emitPromptOverlay({ type: "prompt_overlay_resolved", requestId, status: "submitted" });
  }

  public cancelPromptOverlay(requestId: string): void {
    const activeRequest = this.activePromptOverlay;

    if (!activeRequest || activeRequest.request.requestId !== requestId) {
      throw new Error(`No active prompt overlay request for requestId ${requestId}`);
    }

    activeRequest.resolve("cancel");
    this.activePromptOverlay = undefined;
    this.emitPromptOverlay({ type: "prompt_overlay_resolved", requestId, status: "cancelled" });
  }

  public async sendPrompt(text: string): Promise<void> {
    if (this.state !== "idle" || this.activeRunPromise) {
      throw new Error("Agent is already processing. Use steer/followUp while running.");
    }

    this.setState("running");
    const runPromise = this.runtime.run(text, {
      onStart: (messageId) => {
        this.emit({ type: "response.start", messageId });
      },
      onChunk: (messageId, chunk) => {
        this.emit({ type: "response.chunk", messageId, chunk });
      },
      onEnd: (messageId) => {
        this.emit({ type: "response.end", messageId });
      },
      onError: (error) => {
        if (this.state === "aborting") {
          return;
        }

        this.setState("error");
        this.emit({ type: "error", message: error.message });
      }
    });

    this.activeRunPromise = runPromise;

    try {
      await runPromise;
    } finally {
      if (this.activeRunPromise === runPromise) {
        this.activeRunPromise = undefined;
      }
      this.resetQueueCounts();
      this.setState("idle");
    }
  }

  public async abort(): Promise<void> {
    if (this.state !== "running" || !this.activeRunPromise) {
      return;
    }

    this.setState("aborting");
    await Promise.resolve(this.runtime.abort());
    this.emit({ type: "response.abort" });

    try {
      await this.activeRunPromise;
    } catch {
      // sendPrompt handles state/error emission; abort just waits for run teardown.
    }
  }

  public steer(text: string): void {
    if (!this.runtime.steer) {
      return;
    }

    this.runtime.steer(text);
    this.steerCount++;
    this.emitQueueStatus();
  }

  public followUp(text: string): void {
    if (!this.runtime.followUp) {
      return;
    }

    this.runtime.followUp(text);
    this.followUpCount++;
    this.emitQueueStatus();
  }

  public clearQueue(): { steering: string[]; followUp: string[] } {
    const result = this.runtime.clearQueue?.() ?? { steering: [], followUp: [] };
    this.resetQueueCounts();
    return result;
  }

  private resetQueueCounts(): void {
    this.steerCount = 0;
    this.followUpCount = 0;
    this.emitQueueStatus();
  }

  private emitQueueStatus(): void {
    this.emit({ type: "queue.status", steerCount: this.steerCount, followUpCount: this.followUpCount });
  }

  private setState(state: SessionRunState): void {
    if (this.state === state) {
      return;
    }

    this.state = state;
    this.emit({ type: "state", state });
  }

  private emit(event: SessionTimelineEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private emitPromptOverlay(event: PromptOverlayEvent): void {
    for (const listener of this.promptOverlayListeners) {
      listener(event);
    }
  }
}
