import type { PromptOverlayRequestEvent } from "../../shared/ipc";
import type {
  PromptOverlayDecision,
  PromptOverlayRequestListener,
  RuntimeAdapter,
  RuntimeCallbacks
} from "../orchestrator/OrchestratorService";

export type LocalSdkEvent =
  | { type: "response.start"; messageId: string }
  | { type: "response.chunk"; messageId: string; chunk: string }
  | { type: "response.end"; messageId: string }
  | { type: "error"; message: string };

export interface LocalSdkSession {
  sendPrompt(text: string): Promise<void>;
  abort(): Promise<void> | void;
  steer(text: string): Promise<void> | void;
  followUp(text: string): Promise<void> | void;
  clearQueue(): { steering: string[]; followUp: string[] };
  onEvent(listener: (event: LocalSdkEvent) => void): () => void;
  onPromptOverlayRequest?(listener: (request: PromptOverlayRequestEvent) => void): () => void;
  resolvePromptOverlay?(requestId: string, decision: PromptOverlayDecision): Promise<void> | void;
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

  public steer(text: string): void {
    void this.session.steer(text);
  }

  public followUp(text: string): void {
    void this.session.followUp(text);
  }

  public clearQueue(): { steering: string[]; followUp: string[] } {
    return this.session.clearQueue();
  }

  public onPromptOverlayRequest(listener: PromptOverlayRequestListener): () => void {
    if (!this.session.onPromptOverlayRequest) {
      return () => undefined;
    }

    return this.session.onPromptOverlayRequest((request) => {
      listener(request, (decision) => {
        void this.session.resolvePromptOverlay?.(request.requestId, decision);
      });
    });
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

  const promptDiscovery = discoverMethod(rawSession as Record<string, unknown>, {
    methodNames: ["sendPrompt", "prompt", "runPrompt", "run"],
    nestedContainers: ["session", "agentSession", "manager"]
  });

  const sendPrompt = promptDiscovery.method;

  if (!sendPrompt) {
    throw new Error(
      [
        "Local SDK session object does not expose a prompt method.",
        `attemptedMethods=${promptDiscovery.attemptedMethodNames.join(",")}`,
        `directCandidates=${
          promptDiscovery.directCandidates.length > 0
            ? promptDiscovery.directCandidates.join(",")
            : "none"
        }`,
        `nestedCandidates=${
          promptDiscovery.nestedCandidates.length > 0
            ? promptDiscovery.nestedCandidates.join(",")
            : "none"
        }`,
        `scannedNestedContainers=${
          promptDiscovery.scannedNestedContainers.length > 0
            ? promptDiscovery.scannedNestedContainers.join(",")
            : "none"
        }`,
        `topLevelKeys=${
          promptDiscovery.topLevelKeys.length > 0 ? promptDiscovery.topLevelKeys.join(",") : "none"
        }`
      ].join(" ")
    );
  }

  const abort =
    findFunction(rawSession as Record<string, unknown>, ["abort", "cancel", "stop"]) ?? (() => undefined);

  const onEvent = createEventSubscription(rawSession as Record<string, unknown>);

  const steer =
    findFunction(rawSession as Record<string, unknown>, ["steer"]) ?? (() => undefined);

  const followUp =
    findFunction(rawSession as Record<string, unknown>, ["followUp"]) ?? (() => undefined);

  const clearQueue =
    findFunction(rawSession as Record<string, unknown>, ["clearQueue"]) ??
    (() => ({ steering: [], followUp: [] }));

  const onPromptOverlayRequest =
    findFunction(rawSession as Record<string, unknown>, ["onPromptOverlayRequest"]) ?? undefined;

  const resolvePromptOverlay =
    findFunction(rawSession as Record<string, unknown>, ["resolvePromptOverlay"]) ?? undefined;

  return {
    async sendPrompt(text): Promise<void> {
      await Promise.resolve(sendPrompt(text));
    },
    async abort(): Promise<void> {
      await Promise.resolve(abort());
    },
    steer(text): void {
      void steer(text);
    },
    followUp(text): void {
      void followUp(text);
    },
    clearQueue(): { steering: string[]; followUp: string[] } {
      const result = clearQueue();
      if (result && typeof result === "object" && Array.isArray((result as Record<string, unknown>).steering)) {
        return result as { steering: string[]; followUp: string[] };
      }
      return { steering: [], followUp: [] };
    },
    onEvent,
    onPromptOverlayRequest: onPromptOverlayRequest
      ? (listener): (() => void) => {
          const maybeUnsubscribe = onPromptOverlayRequest(listener);

          if (typeof maybeUnsubscribe === "function") {
            return () => {
              maybeUnsubscribe();
            };
          }

          return () => undefined;
        }
      : undefined,
    resolvePromptOverlay: resolvePromptOverlay
      ? async (requestId: string, decision: PromptOverlayDecision): Promise<void> => {
          await Promise.resolve(resolvePromptOverlay(requestId, decision));
        }
      : undefined
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

interface MethodDiscoveryOptions {
  methodNames: string[];
  nestedContainers?: string[];
}

interface MethodDiscoveryResult {
  method: ((...args: unknown[]) => unknown) | undefined;
  attemptedMethodNames: string[];
  directCandidates: string[];
  nestedCandidates: string[];
  scannedNestedContainers: string[];
  topLevelKeys: string[];
}

function discoverMethod(
  object: Record<string, unknown>,
  options: MethodDiscoveryOptions
): MethodDiscoveryResult {
  const topLevelKeys = Object.keys(object);
  const directCandidates: string[] = [];
  const nestedCandidates: string[] = [];
  const scannedNestedContainers: string[] = [];

  for (const name of options.methodNames) {
    const maybeFn = object[name];
    if (typeof maybeFn === "function") {
      directCandidates.push(name);
      return {
        method: maybeFn.bind(object),
        attemptedMethodNames: options.methodNames,
        directCandidates,
        nestedCandidates,
        scannedNestedContainers,
        topLevelKeys
      };
    }
  }

  for (const containerName of options.nestedContainers ?? []) {
    const nested = object[containerName];
    if (!nested || typeof nested !== "object") {
      continue;
    }

    scannedNestedContainers.push(containerName);
    const nestedObject = nested as Record<string, unknown>;

    for (const name of options.methodNames) {
      const maybeFn = nestedObject[name];
      if (typeof maybeFn === "function") {
        const candidate = `${containerName}.${name}`;
        nestedCandidates.push(candidate);
        return {
          method: maybeFn.bind(nestedObject),
          attemptedMethodNames: options.methodNames,
          directCandidates,
          nestedCandidates,
          scannedNestedContainers,
          topLevelKeys
        };
      }
    }
  }

  return {
    method: undefined,
    attemptedMethodNames: options.methodNames,
    directCandidates,
    nestedCandidates,
    scannedNestedContainers,
    topLevelKeys
  };
}

function findFunction<T extends Record<string, unknown>>(
  object: T,
  names: string[]
): ((...args: unknown[]) => unknown) | undefined {
  return discoverMethod(object, { methodNames: names }).method;
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
