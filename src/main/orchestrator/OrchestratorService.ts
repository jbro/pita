import type { SessionRunState, SessionTimelineEvent } from "../../shared/ipc";

export interface RuntimeCallbacks {
  onStart(messageId: string): void;
  onChunk(messageId: string, chunk: string): void;
  onEnd(messageId: string): void;
  onError(error: Error): void;
}

export interface RuntimeAdapter {
  run(text: string, callbacks: RuntimeCallbacks): Promise<void>;
  abort(): void;
  steer?(text: string): void;
  followUp?(text: string): void;
  clearQueue?(): { steering: string[]; followUp: string[] };
}

type TimelineListener = (event: SessionTimelineEvent) => void;

export class OrchestratorService {
  private state: SessionRunState = "idle";
  private steerCount = 0;
  private followUpCount = 0;
  private readonly listeners = new Set<TimelineListener>();

  public constructor(private readonly runtime: RuntimeAdapter) {}

  public onTimelineEvent(listener: TimelineListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public async sendPrompt(text: string): Promise<void> {
    this.setState("running");

    try {
      await this.runtime.run(text, {
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
    } finally {
      this.resetQueueCounts();
      this.setState("idle");
    }
  }

  public async abort(): Promise<void> {
    if (this.state !== "running") {
      return;
    }

    this.setState("aborting");
    this.runtime.abort();
    this.emit({ type: "response.abort" });
    this.setState("idle");
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
    this.state = state;
    this.emit({ type: "state", state });
  }

  private emit(event: SessionTimelineEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
