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
}

type TimelineListener = (event: SessionTimelineEvent) => void;

export class OrchestratorService {
  private state: SessionRunState = "idle";
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
