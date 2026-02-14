import type { SessionTimelineEvent } from "./ipc";

export type SessionTimelineListener = (event: SessionTimelineEvent) => void;

export interface PitaSessionApi {
  sendPrompt(text: string): Promise<void>;
  abort(): Promise<void>;
  onTimelineEvent(listener: SessionTimelineListener): () => void;
}

export interface PitaPreloadApi {
  pita: {
    version: string;
    session: PitaSessionApi;
  };
}

export const preloadApi: PitaPreloadApi = {
  pita: {
    version: "stub",
    session: {
      async sendPrompt(): Promise<void> {
        return;
      },
      async abort(): Promise<void> {
        return;
      },
      onTimelineEvent(): () => void {
        return () => {
          return;
        };
      }
    }
  }
};
