import type { PitaPreloadApi } from "../shared/preload-api";

declare global {
  interface Window {
    pita: PitaPreloadApi["pita"];
  }
}

export {};
