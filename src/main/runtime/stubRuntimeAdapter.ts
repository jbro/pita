import type { RuntimeAdapter, RuntimeCallbacks } from "../orchestrator/OrchestratorService";

export type StubRuntimeMode = "default" | "manual-abort";

const MANUAL_ABORT_CHUNK_INTERVAL_MS = 400;
const MANUAL_ABORT_CHUNKS = [
  "stub response chunk 1",
  "stub response chunk 2",
  "stub response chunk 3",
  "stub response chunk 4",
  "stub response chunk 5"
];

export function resolveStubRuntimeMode(env: NodeJS.ProcessEnv = process.env): StubRuntimeMode {
  return env.PITA_STUB_RUNTIME_MODE === "manual-abort" ? "manual-abort" : "default";
}

export function createStubRuntimeAdapter(mode: StubRuntimeMode = resolveStubRuntimeMode()): RuntimeAdapter {
  if (mode === "manual-abort") {
    return withQueueSupport(createManualAbortRuntimeAdapter());
  }

  return withQueueSupport({
    async run(_text, callbacks): Promise<void> {
      const messageId = `msg-${Date.now()}`;
      callbacks.onStart(messageId);
      callbacks.onChunk(messageId, "stub response");
      callbacks.onEnd(messageId);
    },
    abort(): void {
      return;
    }
  });
}

function withQueueSupport(adapter: RuntimeAdapter): RuntimeAdapter {
  const steerQueue: string[] = [];
  const followUpQueue: string[] = [];

  adapter.steer = (text: string) => {
    steerQueue.push(text);
  };
  adapter.followUp = (text: string) => {
    followUpQueue.push(text);
  };
  adapter.clearQueue = () => {
    const result = { steering: [...steerQueue], followUp: [...followUpQueue] };
    steerQueue.length = 0;
    followUpQueue.length = 0;
    return result;
  };

  return adapter;
}

function createManualAbortRuntimeAdapter(): RuntimeAdapter {
  let activeRun:
    | {
        messageId: string;
        callbacks: RuntimeCallbacks;
        index: number;
        interval: ReturnType<typeof setInterval>;
        resolve: () => void;
      }
    | undefined;

  return {
    run(_text, callbacks): Promise<void> {
      const messageId = `msg-${Date.now()}`;
      callbacks.onStart(messageId);

      return new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (!activeRun) {
            clearInterval(interval);
            return;
          }

          const chunk = MANUAL_ABORT_CHUNKS[activeRun.index];

          if (!chunk) {
            clearInterval(interval);
            callbacks.onEnd(messageId);
            activeRun = undefined;
            resolve();
            return;
          }

          callbacks.onChunk(messageId, chunk);
          activeRun.index += 1;
        }, MANUAL_ABORT_CHUNK_INTERVAL_MS);

        activeRun = { messageId, callbacks, index: 0, interval, resolve };
      });
    },

    abort(): void {
      if (!activeRun) {
        return;
      }

      clearInterval(activeRun.interval);
      activeRun.callbacks.onError(new Error("aborted"));
      activeRun.resolve();
      activeRun = undefined;
    }
  };
}
