import type { RuntimeAdapter } from "../orchestrator/OrchestratorService";
import { createLocalSdkSession, LocalSdkRuntimeAdapter } from "./localSdkRuntimeAdapter";
import { createStubRuntimeAdapter, resolveStubRuntimeMode, type StubRuntimeMode } from "./stubRuntimeAdapter";

export interface RuntimeSelection {
  kind: "sdk" | "stub";
  runtime: RuntimeAdapter;
  fallbackReason?: string;
}

interface CreateRuntimeAdapterOptions {
  env?: NodeJS.ProcessEnv;
  createSdkRuntime?: () => Promise<RuntimeAdapter>;
  createStubRuntime?: (mode: StubRuntimeMode) => RuntimeAdapter;
}

export async function createRuntimeAdapter(
  options: CreateRuntimeAdapterOptions = {}
): Promise<RuntimeSelection> {
  const env = options.env ?? process.env;
  const runtimeKind = env.PITA_RUNTIME_KIND;
  const createSdkRuntime =
    options.createSdkRuntime ??
    (async () => {
      const session = await createLocalSdkSession(env);
      return new LocalSdkRuntimeAdapter(session);
    });
  const createStubRuntime = options.createStubRuntime ?? createStubRuntimeAdapter;
  const stubMode = resolveStubRuntimeMode(env);

  if (runtimeKind === "stub") {
    return {
      kind: "stub",
      runtime: createStubRuntime(stubMode)
    };
  }

  try {
    return {
      kind: "sdk",
      runtime: await createSdkRuntime()
    };
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : String(error);

    return {
      kind: "stub",
      runtime: createStubRuntime(stubMode),
      fallbackReason
    };
  }
}
