import type { RuntimeAdapter } from "../orchestrator/OrchestratorService";
import { createLocalSdkSession, LocalSdkRuntimeAdapter } from "./localSdkRuntimeAdapter";
import { createStubRuntimeAdapter, resolveStubRuntimeMode, type StubRuntimeMode } from "./stubRuntimeAdapter";

export interface RuntimeSelection {
  kind: "sdk" | "stub";
  runtime: RuntimeAdapter;
  fallbackReason?: string;
  startupMessage: string;
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
      runtime: createStubRuntime(stubMode),
      startupMessage: buildStartupMessage({
        selectedKind: "stub",
        requestedKind: "stub",
        stubMode,
        fallbackReason: undefined
      })
    };
  }

  try {
    return {
      kind: "sdk",
      runtime: await createSdkRuntime(),
      startupMessage: buildStartupMessage({
        selectedKind: "sdk",
        requestedKind: "sdk-default",
        stubMode,
        fallbackReason: undefined
      })
    };
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : String(error);

    return {
      kind: "stub",
      runtime: createStubRuntime(stubMode),
      fallbackReason,
      startupMessage: buildStartupMessage({
        selectedKind: "stub",
        requestedKind: "sdk-default",
        stubMode,
        fallbackReason
      })
    };
  }
}

interface RuntimeStartupMetadata {
  selectedKind: "sdk" | "stub";
  requestedKind: "sdk-default" | "stub";
  stubMode: StubRuntimeMode;
  fallbackReason?: string;
}

function buildStartupMessage(metadata: RuntimeStartupMetadata): string {
  const fallback = metadata.fallbackReason ? "yes" : "no";
  const reasonSegment = metadata.fallbackReason ? ` reason=${metadata.fallbackReason}` : "";

  return `[pita] Runtime selection: selected=${metadata.selectedKind} requested=${metadata.requestedKind} stubMode=${metadata.stubMode} fallback=${fallback}${reasonSegment}`;
}
