import type { SessionClearQueueResponse, SessionTimelineEvent } from "./ipc";

export type SessionTimelineListener = (event: SessionTimelineEvent) => void;

export interface PitaSessionApi {
  sendPrompt(text: string): Promise<void>;
  abort(): Promise<void>;
  steer(text: string): Promise<void>;
  followUp(text: string): Promise<void>;
  clearQueue(): Promise<SessionClearQueueResponse>;
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
      async steer(): Promise<void> {
        return;
      },
      async followUp(): Promise<void> {
        return;
      },
      async clearQueue(): Promise<SessionClearQueueResponse> {
        return { steering: [], followUp: [] };
      },
      onTimelineEvent(): () => void {
        return () => {
          return;
        };
      }
    }
  }
};
