import type { RuntimeAdapter, RuntimeCallbacks } from "../orchestrator/OrchestratorService";

export type LocalSdkEvent =
  | { type: "response.start"; messageId: string }
  | { type: "response.chunk"; messageId: string; chunk: string }
  | { type: "response.end"; messageId: string }
  | { type: "error"; message: string };

export interface LocalSdkSession {
  sendPrompt(text: string): Promise<void>;
  abort(): Promise<void> | void;
  onEvent(listener: (event: LocalSdkEvent) => void): () => void;
}

export class LocalSdkRuntimeAdapter implements RuntimeAdapter {
  public constructor(private readonly session: LocalSdkSession) {}

  public async run(text: string, callbacks: RuntimeCallbacks): Promise<void> {
    const fallbackMessageId = `sdk-msg-${Date.now()}`;
    let emittedStart = false;
    let emittedEnd = false;

    const unsubscribe = this.session.onEvent((event) => {
      switch (event.type) {
        case "response.start": {
          emittedStart = true;
          callbacks.onStart(event.messageId);
          break;
        }
        case "response.chunk": {
          emittedStart = true;
          callbacks.onChunk(event.messageId, event.chunk);
          break;
        }
        case "response.end": {
          emittedEnd = true;
          callbacks.onEnd(event.messageId);
          break;
        }
        case "error": {
          callbacks.onError(new Error(event.message));
          break;
        }
      }
    });

    try {
      if (!emittedStart) {
        callbacks.onStart(fallbackMessageId);
      }

      await this.session.sendPrompt(text);

      if (!emittedEnd) {
        callbacks.onEnd(fallbackMessageId);
      }
    } catch (error) {
      const errorToReport = error instanceof Error ? error : new Error(String(error));
      callbacks.onError(errorToReport);
    } finally {
      unsubscribe();
    }
  }

  public async abort(): Promise<void> {
    await this.session.abort();
  }
}

export async function createLocalSdkSession(
  env: NodeJS.ProcessEnv = process.env,
  moduleLoader: (moduleName: string) => Promise<Record<string, unknown>> = defaultModuleLoader
): Promise<LocalSdkSession> {
  const moduleName = env.PITA_LOCAL_SDK_MODULE ?? "@mariozechner/pi-coding-agent";
  const sdkModule = await moduleLoader(moduleName);
  const createAgentSession = findFunction(sdkModule, ["createAgentSession"]);

  if (!createAgentSession) {
    throw new Error(`Local SDK module '${moduleName}' does not export createAgentSession().`);
  }

  const rawSession = await createAgentSession();

  if (!rawSession || typeof rawSession !== "object") {
    throw new Error("createAgentSession() did not return a session object.");
  }

  const sendPrompt = findFunction(rawSession as Record<string, unknown>, [
    "sendPrompt",
    "prompt",
    "runPrompt",
    "run"
  ]);

  if (!sendPrompt) {
    throw new Error("Local SDK session object does not expose a prompt method.");
  }

  const abort =
    findFunction(rawSession as Record<string, unknown>, ["abort", "cancel", "stop"]) ?? (() => undefined);

  const onEvent = createEventSubscription(rawSession as Record<string, unknown>);

  return {
    async sendPrompt(text): Promise<void> {
      await Promise.resolve(sendPrompt(text));
    },
    async abort(): Promise<void> {
      await Promise.resolve(abort());
    },
    onEvent
  };
}

async function defaultModuleLoader(moduleName: string): Promise<Record<string, unknown>> {
  const dynamicImport = new Function("name", "return import(name);") as (
    name: string
  ) => Promise<Record<string, unknown>>;

  return dynamicImport(moduleName);
}

function createEventSubscription(rawSession: Record<string, unknown>): LocalSdkSession["onEvent"] {
  const onEvent = findFunction(rawSession, ["onEvent", "subscribe", "onSessionEvent"]);

  if (onEvent) {
    return (listener) => {
      const maybeUnsubscribe = onEvent(listener);

      if (typeof maybeUnsubscribe === "function") {
        return () => {
          maybeUnsubscribe();
        };
      }

      return () => undefined;
    };
  }

  const on = findFunction(rawSession, ["on"]);
  const off = findFunction(rawSession, ["off", "removeListener"]);

  if (on) {
    return (listener) => {
      const handler = (event: unknown) => {
        if (isLocalSdkEvent(event)) {
          listener(event);
        }
      };

      on("event", handler);

      return () => {
        if (off) {
          off("event", handler);
        }
      };
    };
  }

  return () => () => undefined;
}

function findFunction<T extends Record<string, unknown>>(
  object: T,
  names: string[]
): ((...args: unknown[]) => unknown) | undefined {
  for (const name of names) {
    const maybeFn = object[name];
    if (typeof maybeFn === "function") {
      return maybeFn.bind(object);
    }
  }

  return undefined;
}

function isLocalSdkEvent(value: unknown): value is LocalSdkEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as { type?: unknown };

  if (event.type === "response.start") {
    return typeof (value as { messageId?: unknown }).messageId === "string";
  }

  if (event.type === "response.chunk") {
    return (
      typeof (value as { messageId?: unknown }).messageId === "string" &&
      typeof (value as { chunk?: unknown }).chunk === "string"
    );
  }

  if (event.type === "response.end") {
    return typeof (value as { messageId?: unknown }).messageId === "string";
  }

  if (event.type === "error") {
    return typeof (value as { message?: unknown }).message === "string";
  }

  return false;
}
